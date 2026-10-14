/*
    DailyRedDayGet
    The stored team of a day, if it was generated already.
*/
CREATE PROCEDURE [dbo].[DailyRedDayGet]
    @DayKey DATE
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT d.[Team]
    FROM [dbo].[DailyRedDay] d
    WHERE d.[DayKey] = @DayKey;
END
