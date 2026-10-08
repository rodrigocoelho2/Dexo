/*
    BattleSave
    Saves a finished battle (replaces it if it was saved before).
*/
CREATE PROCEDURE [dbo].[BattleSave]
    @BattleID   VARCHAR (32),
    @Format     VARCHAR (32),
    @P1UserID   BIGINT = NULL,
    @P2UserID   BIGINT = NULL,
    @P1Name     NVARCHAR (32),
    @P2Name     NVARCHAR (32),
    @IsCpu      BIT,
    @Winner     INT,
    @Reason     VARCHAR (16),
    @Turns      INT,
    @P1Left     INT,
    @P2Left     INT,
    @P1BestKo   INT,
    @P2BestKo   INT,
    @Teams      NVARCHAR (MAX) = NULL,
    @Log        NVARCHAR (MAX) = NULL,
    @Background VARCHAR (64) = NULL,
    @StartedAt  DATETIME2 (3),
    @EndedAt    DATETIME2 (3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    BEGIN TRANSACTION;

    DELETE FROM [dbo].[Battle] WHERE [BattleID] = @BattleID;

    INSERT INTO [dbo].[Battle] ([BattleID], [Format], [P1UserID], [P2UserID], [P1Name], [P2Name], [IsCpu], [Winner], [Reason], [Turns],
                                [P1Left], [P2Left], [P1BestKo], [P2BestKo], [Teams], [Log], [Background], [StartedAt], [EndedAt])
    VALUES (@BattleID, @Format, @P1UserID, @P2UserID, @P1Name, @P2Name, @IsCpu, @Winner, @Reason, @Turns,
            @P1Left, @P2Left, @P1BestKo, @P2BestKo, @Teams, @Log, @Background, @StartedAt, @EndedAt);

    COMMIT TRANSACTION;
END
