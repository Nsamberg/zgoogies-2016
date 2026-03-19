import { describe, it, expect } from 'vitest'
import * as apiModule from '../services/api'

describe('api service exports', () => {
  it('exports authAPI with required methods', () => {
    expect(typeof apiModule.authAPI.login).toBe('function')
    expect(typeof apiModule.authAPI.logout).toBe('function')
    expect(typeof apiModule.authAPI.getCurrentUser).toBe('function')
    expect(typeof apiModule.authAPI.register).toBe('function')
    expect(typeof apiModule.authAPI.updateProfile).toBe('function')
    expect(typeof apiModule.authAPI.changePassword).toBe('function')
    expect(typeof apiModule.authAPI.resetPassword).toBe('function')
  })

  it('exports gamesAPI with required methods', () => {
    expect(typeof apiModule.gamesAPI.getUpcoming).toBe('function')
    expect(typeof apiModule.gamesAPI.getClosed).toBe('function')
  })

  it('exports predictionsAPI with required methods', () => {
    expect(typeof apiModule.predictionsAPI.getPredictions).toBe('function')
    expect(typeof apiModule.predictionsAPI.createPrediction).toBe('function')
  })

  it('exports rankingsAPI with required methods', () => {
    expect(typeof apiModule.rankingsAPI.getOverall).toBe('function')
    expect(typeof apiModule.rankingsAPI.getRounds).toBe('function')
    expect(typeof apiModule.rankingsAPI.getRound).toBe('function')
  })

  it('exports playersAPI with required methods', () => {
    expect(typeof apiModule.playersAPI.getAll).toBe('function')
    expect(typeof apiModule.playersAPI.getPlayerPredictions).toBe('function')
  })

  it('exports newsAPI with required methods', () => {
    expect(typeof apiModule.newsAPI.getAll).toBe('function')
    expect(typeof apiModule.newsAPI.create).toBe('function')
    expect(typeof apiModule.newsAPI.update).toBe('function')
    expect(typeof apiModule.newsAPI.delete).toBe('function')
  })

  it('exports adminAPI with required methods', () => {
    expect(typeof apiModule.adminAPI.getUsers).toBe('function')
    expect(typeof apiModule.adminAPI.getGames).toBe('function')
    expect(typeof apiModule.adminAPI.recordPayment).toBe('function')
    expect(typeof apiModule.adminAPI.removePayment).toBe('function')
    expect(typeof apiModule.adminAPI.enterScore).toBe('function')
    expect(typeof apiModule.adminAPI.rollbackScore).toBe('function')
    expect(typeof apiModule.adminAPI.getDatetimeOverride).toBe('function')
    expect(typeof apiModule.adminAPI.setDatetimeOverride).toBe('function')
    expect(typeof apiModule.adminAPI.clearDatetimeOverride).toBe('function')
    expect(typeof apiModule.adminAPI.getTournamentWinner).toBe('function')
    expect(typeof apiModule.adminAPI.setTournamentWinner).toBe('function')
    expect(typeof apiModule.adminAPI.rollbackTournamentWinner).toBe('function')
  })

  it('exports teamsAPI with required methods', () => {
    expect(typeof apiModule.teamsAPI.getAll).toBe('function')
  })
})
