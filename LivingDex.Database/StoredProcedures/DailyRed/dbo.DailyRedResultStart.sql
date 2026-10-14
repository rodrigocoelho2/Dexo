/*
    DailyRedResultStart
    Claims a trainer's official battle of the day. @Started is 0 when that day already has one.
*/
CREATE PROCEDURE [dbo].[DailyRedResultStart]
    @UserID    BIGINT,
    @DayKey    DATE,
    @BattleID  VARCHAR (32),
    @StartedAt DATETIME2 (3),
    @Started   BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

    BEGIN TRANSACTION;

    SET @Started = 0;
    IF NOT EXISTS (SELECT 1 FROM [dbo].[DailyRedResult] WITH (UPDLOCK, HOLDLOCK) WHERE [UserID] = @UserID AND [DayKey] = @DayKey)
    BEGIN
        INSERT INTO [dbo].[DailyRedResult] ([UserID], [DayKey], [BattleID], [Status], [StartedAt])
        VALUES (@UserID, @DayKey, @BattleID, 0, @StartedAt);
        SET @Started = 1;
    END

    COMMIT TRANSACTION;
END
