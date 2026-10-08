/*
    BattleTrainerRecord
    Every decided battle of a trainer, oldest first; the WebApi works out the record, streak and badges from it.
*/
CREATE PROCEDURE [dbo].[BattleTrainerRecord]
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT b.[Format],
           b.[P1UserID],
           b.[P2UserID],
           b.[IsCpu],
           b.[Winner],
           b.[P1Left],
           b.[P2Left],
           b.[P1BestKo],
           b.[P2BestKo]
    FROM [dbo].[Battle] b
    WHERE (b.[P1UserID] = @UserID OR b.[P2UserID] = @UserID)
      AND b.[Winner] > 0
    ORDER BY b.[EndedAt];
END
