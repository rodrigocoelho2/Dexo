CREATE TABLE [dbo].[TrainerProfile]
(
    [UserID]       BIGINT        NOT NULL,
    [Partner]      INT           NOT NULL CONSTRAINT [DF_TrainerProfile_Partner] DEFAULT (25),
    [PartnerShiny] BIT           NOT NULL CONSTRAINT [DF_TrainerProfile_PartnerShiny] DEFAULT (0),
    [LastSeenAt]   DATETIME2 (3) NULL,
    CONSTRAINT [PK_TrainerProfile] PRIMARY KEY CLUSTERED ([UserID] ASC),
    CONSTRAINT [FK_TrainerProfile_User] FOREIGN KEY ([UserID]) REFERENCES [dbo].[User] ([UserID]) ON DELETE CASCADE,
    CONSTRAINT [CK_TrainerProfile_Partner] CHECK ([Partner] BETWEEN 1 AND 1025)
);
GO

EXECUTE sp_addextendedproperty @name = N'MS_Description', @value = N'Trainer card: partner Pokémon (national dex number) and when the trainer was last seen in Showdown.',
    @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'TrainerProfile';
