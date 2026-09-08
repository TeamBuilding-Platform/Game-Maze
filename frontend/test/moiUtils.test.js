import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyMoiEvent, getMoiLabel } from '../src/components/display/moiUtils.js'

test('hazard timeline keeps wall, skull, and ghost collisions distinct', () => {
  const wall = { event: 'hazard_hit', hazardType: 'wall' }
  const skull = { event: 'hazard_hit', hazardType: 'skull' }
  const legacyGridHazard = { event: 'hazard_hit', hazardType: 'grid' }
  const ghost = { event: 'hazard_hit', hazardType: 'ghost' }

  assert.equal(classifyMoiEvent(wall), 'hazard_wall')
  assert.equal(getMoiLabel(wall), 'Hit Wall')
  assert.equal(classifyMoiEvent(skull), 'hazard_skull')
  assert.equal(getMoiLabel(skull), 'Hit Skull')
  assert.equal(classifyMoiEvent(legacyGridHazard), 'hazard_skull')
  assert.equal(getMoiLabel(legacyGridHazard), 'Hit Skull')
  assert.equal(classifyMoiEvent(ghost), 'hazard_ghost')
  assert.equal(getMoiLabel(ghost), 'Hit Ghost')
})
