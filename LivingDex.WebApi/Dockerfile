# Build from the repository root:  docker build -f LivingDex.WebApi/Dockerfile -t livingdex .

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props Directory.Packages.props ./
COPY LivingDex.Library/LivingDex.Library.csproj LivingDex.Library/
COPY LivingDex.WebApi/LivingDex.WebApi.csproj LivingDex.WebApi/
RUN dotnet restore LivingDex.WebApi/LivingDex.WebApi.csproj
COPY LivingDex.Library/ LivingDex.Library/
COPY LivingDex.WebApi/ LivingDex.WebApi/
RUN dotnet publish LivingDex.WebApi/LivingDex.WebApi.csproj -c Release -o /app --no-restore

# ---- battle simulator (Pokémon Showdown on Node.js) ----
FROM node:22-bookworm-slim AS sim
WORKDIR /sim
COPY LivingDex.WebApi/Simulator/package.json LivingDex.WebApi/Simulator/package-lock.json ./
# Only the simulator code is needed: skip optional database drivers and install scripts.
RUN npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY LivingDex.WebApi/Simulator/bridge.js ./

# ---- runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
# Node.js runs the simulator as a child process of the app, inside this same container.
COPY --from=sim /usr/local/bin/node /usr/local/bin/node
COPY --from=sim /sim ./Simulator
# Sprites, cries, battle backgrounds and music shipped with the app (served before anything is downloaded).
COPY LivingDex.Assets/ ./assets/
# Files extracted on a NAS can keep owner-only permissions; the app runs as the non-root "app" user.
RUN rm -f ./assets/README.md && chmod -R a+rX /app && node --version

ENV ASPNETCORE_HTTP_PORTS=8080 \
    LivingDex__DataDirectory=/data \
    LivingDex__AssetsDirectory=/app/assets

# The aspnet image runs as the non-root "app" user (UID in $APP_UID); give it the data folder.
RUN mkdir -p /data && chown -R $APP_UID /data
VOLUME /data
USER $APP_UID

EXPOSE 8080
ENTRYPOINT ["dotnet", "LivingDex.WebApi.dll"]
