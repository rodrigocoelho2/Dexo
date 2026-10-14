CREATE TABLE [dbo].[DailyRedResult]
(
    [UserID]    BIGINT        NOT NULL,
    [DayKey]    DATE          NOT NULL,
    [BattleID]  VARCHAR (32)  NOT NULL,
    [Status]    TINYINT       NOT NULL CONSTRAINT [DF_DailyRedResult_Status] DEFAULT (0),
    [Turns]     INT           NOT NULL CONSTRAINT [DF_DailyRedResult_Turns] DEFAULT (0),
    [MonsLeft]  INT           NOT NULL CONSTRAINT [DF_DailyRedResult_MonsLeft] DEFAULT (0),
    [RedLeft]   INT           NOT NULL CONSTRAINT [DF_DailyRedResult_RedLeft] DEFAULT (0),
    [Grid]      VARCHAR (12)  NULL,
    [StartedAt] DATETIME2 (3) NOT NULL,
    [EndedAt]   DATETIME2 (3) NULL,
    CONSTRAINT [PK_DailyRedResult] PRIMARY KEY CLUSTERED ([UserID] ASC, [DayKey] ASC),
    CONSTRAINT [FK_DailyRedResult_User] FOREIGN KEY ([UserID]) REFERENCES [dbo].[User] ([UserID]) ON DELETE CASCADE,
    CONSTRAINT [CK_DailyRedResult_Status] CHECK ([Status] BETWEEN 0 AND 2)
);
GO

CREATE NONCLUSTERED INDEX [IX_DailyRedResult_DayKey] ON [dbo].[DailyRedResult] ([DayKey] ASC);
GO

EXECUTE sp_addextendedproperty @name = N'MS_Description', @value = N'Daily Red: each trainer''s one official battle per day (their own local date). Status: 0 playing, 1 won, 2 lost. Grid: one character per Pokémon in battle order, 1 still standing, 0 fainted.',
    @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'DailyRedResult';
