/*
    DailyRedResultFinish
    Records how the official battle ended (only for the battle that claimed the day, and only once).
*/
CREATE PROCEDURE [dbo].[DailyRedResultFinish]
    @UserID   BIGINT,
    @DayKey   DATE,
    @BattleID VARCHAR (32),
    @Status   TINYINT,
    @Turns    INT,
    @MonsLeft INT,
    @RedLeft  INT,
    @Grid     VARCHAR (12) = NULL,
    @EndedAt  DATETIME2 (3)
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    UPDATE [dbo].[DailyRedResult]
    SET [Status] = @Status,
        [Turns] = @Turns,
        [MonsLeft] = @MonsLeft,
        [RedLeft] = @RedLeft,
        [Grid] = @Grid,
        [EndedAt] = @EndedAt
    WHERE [UserID] = @UserID
      AND [DayKey] = @DayKey
      AND [BattleID] = @BattleID
      AND [Status] = 0;
END
