/*
    DailyRedDaySave
    Stores the team of a day unless one is stored already, and returns the stored one (the first writer wins).
*/
CREATE PROCEDURE [dbo].[DailyRedDaySave]
    @DayKey DATE,
    @Team   NVARCHAR (MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

    BEGIN TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM [dbo].[DailyRedDay] WITH (UPDLOCK, HOLDLOCK) WHERE [DayKey] = @DayKey)
    BEGIN
        INSERT INTO [dbo].[DailyRedDay] ([DayKey], [Team]) VALUES (@DayKey, @Team);
    END

    COMMIT TRANSACTION;

    SELECT d.[Team]
    FROM [dbo].[DailyRedDay] d
    WHERE d.[DayKey] = @DayKey;
END
