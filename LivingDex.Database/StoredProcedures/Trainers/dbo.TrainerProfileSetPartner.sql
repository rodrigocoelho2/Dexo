/*
    TrainerProfileSetPartner
    Sets the partner Pokémon shown on the trainer card.
*/
CREATE PROCEDURE [dbo].[TrainerProfileSetPartner]
    @UserID       BIGINT,
    @Partner      INT,
    @PartnerShiny BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    BEGIN TRANSACTION;

    UPDATE [dbo].[TrainerProfile] WITH (UPDLOCK, SERIALIZABLE)
    SET [Partner] = @Partner,
        [PartnerShiny] = @PartnerShiny
    WHERE [UserID] = @UserID;

    IF @@ROWCOUNT = 0
    BEGIN
        INSERT INTO [dbo].[TrainerProfile] ([UserID], [Partner], [PartnerShiny])
        VALUES (@UserID, @Partner, @PartnerShiny);
    END

    COMMIT TRANSACTION;
END
