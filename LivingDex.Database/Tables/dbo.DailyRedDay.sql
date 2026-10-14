CREATE TABLE [dbo].[DailyRedDay]
(
    [DayKey]    DATE           NOT NULL,
    [Team]      NVARCHAR (MAX) NOT NULL,
    [CreatedAt] DATETIME2 (3)  NOT NULL CONSTRAINT [DF_DailyRedDay_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_DailyRedDay] PRIMARY KEY CLUSTERED ([DayKey] ASC)
);
GO

EXECUTE sp_addextendedproperty @name = N'MS_Description', @value = N'Daily Red: the team of each day (JSON from the simulator: the six sets, how they show on the page, Red''s team and the matchups). Stored the first time a day is asked for, so it never changes afterwards.',
    @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'DailyRedDay';
