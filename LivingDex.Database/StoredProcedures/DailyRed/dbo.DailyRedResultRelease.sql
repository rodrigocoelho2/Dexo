/*
    DailyRedResultRelease
    Gives the day back when its official battle was stopped without a result (the simulator restarted).
*/
CREATE PROCEDURE [dbo].[DailyRedResultRelease]
    @UserID   BIGINT,
    @DayKey   DATE,
    @BattleID VARCHAR (32)
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    DELETE FROM [dbo].[DailyRedResult]
    WHERE [UserID] = @UserID
      AND [DayKey] = @DayKey
      AND [BattleID] = @BattleID
      AND [Status] = 0;
END
