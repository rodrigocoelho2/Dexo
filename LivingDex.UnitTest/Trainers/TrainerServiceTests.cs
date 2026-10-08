using LivingDex.Library.Services;
using LivingDex.WebApi.Features.Trainers.Models.DTOs;
using LivingDex.WebApi.Features.Trainers.Models.Entities;
using LivingDex.WebApi.Features.Trainers.Services;

namespace LivingDex.UnitTest.Trainers;

public sealed class TrainerServiceTests
{
    private readonly FakeTrainerRepository _trainers = new();
    private readonly TrainerService _service;

    public TrainerServiceTests()
    {
        _service = new TrainerService(_trainers, TestSupport.Globalization);
        _trainers.Profiles.Add(new TrainerProfile { UserID = 1, Username = "Rodas", LivingDex = 3 });
        _trainers.Profiles.Add(new TrainerProfile { UserID = 2, Username = "Ana" });
        _trainers.Battles.Add(new TrainerBattle { Format = "gen5randombattle", P1UserID = 1, P2UserID = 2, Winner = 1, P1Left = 2 });
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1026)]
    public async Task SetPartner_OutOfRange_IsAValidationProblem(int partner)
    {
        var response = await _service.SetPartnerAsync(1, new PartnerDTO { Partner = partner });

        Assert.Equal(ServiceApiResponseStatus.ValidationProblems, response.Status);
        Assert.Equal("Pick a Pokémon from #1 to #1025.", response.Problems!.Detail);
    }

    [Fact]
    public async Task List_CardsCarryProfileAndRecord()
    {
        await _service.SetPartnerAsync(1, new PartnerDTO { Partner = 169, Shiny = true });

        var cards = (await _service.ListAsync()).Result!;

        Assert.Equal(["Ana", "Rodas"], cards.Select(card => card.Name));
        var rodas = cards.Single(card => card.Id == 1);
        Assert.Equal(169, rodas.Partner);
        Assert.True(rodas.PartnerShiny);
        Assert.Equal(3, rodas.LivingDex);
        Assert.Equal(1, rodas.Wins);
        Assert.Equal(1, cards.Single(card => card.Id == 2).Losses);
    }

    [Fact]
    public async Task Get_UnknownTrainer_IsNotFound() =>
        Assert.Equal(ServiceApiResponseStatus.NotFound, (await _service.GetAsync(99)).Status);
}
