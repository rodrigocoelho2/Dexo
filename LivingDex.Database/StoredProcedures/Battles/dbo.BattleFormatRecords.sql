/*
    BattleFormatRecords
    Wins and losses per format against other trainers (CPU battles and draws left out), for the profile.
*/
CREATE PROCEDURE [dbo].[BattleFormatRecords]
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT b.[Format],
           SUM(CASE WHEN (b.[P1UserID] = @UserID AND b.[Winner] = 1) OR (b.[P2UserID] = @UserID AND b.[Winner] = 2) THEN 1 ELSE 0 END) AS [Wins],
           SUM(CASE WHEN (b.[P1UserID] = @UserID AND b.[Winner] = 2) OR (b.[P2UserID] = @UserID AND b.[Winner] = 1) THEN 1 ELSE 0 END) AS [Losses]
    FROM [dbo].[Battle] b
    WHERE (b.[P1UserID] = @UserID OR b.[P2UserID] = @UserID)
      AND b.[IsCpu] = 0
    GROUP BY b.[Format];
END
