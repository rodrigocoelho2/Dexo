# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/LivingDex/LivingDex.csproj src/LivingDex/
RUN dotnet restore src/LivingDex/LivingDex.csproj
COPY src/LivingDex/ src/LivingDex/
RUN dotnet publish src/LivingDex/LivingDex.csproj -c Release -o /app --no-restore

# ---- battle simulator (Pokémon Showdown on Node.js) ----
FROM node:22-bookworm-slim AS sim
WORKDIR /sim
COPY src/LivingDex/sim/package.json src/LivingDex/sim/package-lock.json ./
# Only the simulator code is needed: skip optional database drivers and install scripts.
RUN npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY src/LivingDex/sim/bridge.js ./

# ---- runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
# Node.js runs the simulator as a child process of the app, inside this same container.
COPY --from=sim /usr/local/bin/node /usr/local/bin/node
COPY --from=sim /sim ./sim
# Files extracted on a NAS can keep owner-only permissions; the app runs as the non-root "app" user.
RUN chmod -R a+rX /app && node --version

ENV ASPNETCORE_HTTP_PORTS=8080 \
    LivingDex__DataDirectory=/data

# The aspnet image runs as the non-root "app" user (UID in $APP_UID); give it the data folder.
RUN mkdir -p /data && chown -R $APP_UID /data
VOLUME /data
USER $APP_UID

EXPOSE 8080
ENTRYPOINT ["dotnet", "LivingDex.dll"]
