/*
    Post-deployment script of LivingDex.Database.
    Runs after every publish of the dacpac. There is no reference data to seed today; accounts are created
    from the app (the first one becomes the admin) or imported from the old SQLite file by the WebApi.
*/
PRINT N'LivingDex.Database deployed.';
