CREATE TABLE [dbo].[UserStateHistory]
(
    [UserID]    BIGINT         NOT NULL,
    [Revision]  BIGINT         NOT NULL,
    [Data]      NVARCHAR (MAX) NOT NULL,
    [UpdatedAt] DATETIME2 (3)  NOT NULL,
    [Client]    NVARCHAR (80)  NULL,
    CONSTRAINT [PK_UserStateHistory] PRIMARY KEY CLUSTERED ([UserID] ASC, [Revision] ASC),
    CONSTRAINT [FK_UserStateHistory_User] FOREIGN KEY ([UserID]) REFERENCES [dbo].[User] ([UserID]) ON DELETE CASCADE
);
GO

EXECUTE sp_addextendedproperty @name = N'MS_Description', @value = N'Past revisions of each trainer''s progress, for Restore. Only the newest ones are kept (LivingDex:HistoryLimit).',
    @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'UserStateHistory';
