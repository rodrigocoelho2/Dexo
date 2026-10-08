CREATE TABLE [dbo].[Battle]
(
    [BattleID]   VARCHAR (32)   NOT NULL,
    [Format]     VARCHAR (32)   NOT NULL,
    [P1UserID]   BIGINT         NULL,
    [P2UserID]   BIGINT         NULL,
    [P1Name]     NVARCHAR (32)  NOT NULL,
    [P2Name]     NVARCHAR (32)  NOT NULL,
    [IsCpu]      BIT            NOT NULL CONSTRAINT [DF_Battle_IsCpu] DEFAULT (0),
    [Winner]     INT            NOT NULL CONSTRAINT [DF_Battle_Winner] DEFAULT (0),
    [Reason]     VARCHAR (16)   NOT NULL CONSTRAINT [DF_Battle_Reason] DEFAULT ('normal'),
    [Turns]      INT            NOT NULL CONSTRAINT [DF_Battle_Turns] DEFAULT (0),
    [P1Left]     INT            NOT NULL CONSTRAINT [DF_Battle_P1Left] DEFAULT (0),
    [P2Left]     INT            NOT NULL CONSTRAINT [DF_Battle_P2Left] DEFAULT (0),
    [P1BestKo]   INT            NOT NULL CONSTRAINT [DF_Battle_P1BestKo] DEFAULT (0),
    [P2BestKo]   INT            NOT NULL CONSTRAINT [DF_Battle_P2BestKo] DEFAULT (0),
    [Teams]      NVARCHAR (MAX) NULL,
    [Log]        NVARCHAR (MAX) NULL,
    [Background] VARCHAR (64)   NULL,
    [StartedAt]  DATETIME2 (3)  NOT NULL,
    [EndedAt]    DATETIME2 (3)  NOT NULL,
    CONSTRAINT [PK_Battle] PRIMARY KEY CLUSTERED ([BattleID] ASC),
    -- No ON DELETE action: SQL Server allows only one cascade path to [User]; UserDelete clears both columns first.
    CONSTRAINT [FK_Battle_P1User] FOREIGN KEY ([P1UserID]) REFERENCES [dbo].[User] ([UserID]),
    CONSTRAINT [FK_Battle_P2User] FOREIGN KEY ([P2UserID]) REFERENCES [dbo].[User] ([UserID]),
    CONSTRAINT [CK_Battle_Winner] CHECK ([Winner] BETWEEN 0 AND 2)
);
GO

CREATE NONCLUSTERED INDEX [IX_Battle_P1UserID_EndedAt] ON [dbo].[Battle] ([P1UserID] ASC, [EndedAt] DESC);
GO

CREATE NONCLUSTERED INDEX [IX_Battle_P2UserID_EndedAt] ON [dbo].[Battle] ([P2UserID] ASC, [EndedAt] DESC);
GO

EXECUTE sp_addextendedproperty @name = N'MS_Description', @value = N'Finished Showdown battles with teams and the full log, for records, badges and replays. Winner: 0 draw, 1 player one, 2 player two.',
    @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'Battle';
