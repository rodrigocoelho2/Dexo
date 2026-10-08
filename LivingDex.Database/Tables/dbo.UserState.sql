CREATE TABLE [dbo].[UserState]
(
    [UserID]    BIGINT         NOT NULL,
    [Revision]  BIGINT         NOT NULL,
    [Data]      NVARCHAR (MAX) NOT NULL,
    [UpdatedAt] DATETIME2 (3)  NOT NULL,
    CONSTRAINT [PK_UserState] PRIMARY KEY CLUSTERED ([UserID] ASC),
    CONSTRAINT [FK_UserState_User] FOREIGN KEY ([UserID]) REFERENCES [dbo].[User] ([UserID]) ON DELETE CASCADE,
    CONSTRAINT [CK_UserState_Data_IsJson] CHECK (ISJSON([Data]) = 1)
);
GO

EXECUTE sp_addextendedproperty @name = N'MS_Description', @value = N'Current progress of each trainer (boxes, capture details, catch log, dex badges) as JSON, with an optimistic-concurrency revision.',
    @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'UserState';
