import { expect, test } from '@jest/globals';
import { validationResult } from 'express-validator';
import { createDocumentValidation, updateDocumentValidation } from '../../src/modules/documents/validators/documents.validator.js';

async function validate(validators, body) {
  const req = { body, params: { id: '1' } };
  for (const validator of validators) await validator.run(req);
  return validationResult(req);
}

test.each(['OV', 'OC', 'PR', 'RE', 'NC'])('%s is accepted on creation and update', async (type) => {
  const created = await validate(createDocumentValidation, { number: `${type}-1`, clientId: 1, amount: '100.00', type });
  expect(created.array()).toEqual([]);
  const updated = await validate(updateDocumentValidation, { type });
  expect(updated.array()).toEqual([]);
});

test.each(['XX', 'ov', 1, null])('unsupported type %s is rejected on creation and update', async (type) => {
  for (const validators of [createDocumentValidation, updateDocumentValidation]) {
    const result = await validate(validators, { number: 'DOC-1', clientId: 1, amount: '100.00', type });
    expect(result.array()).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'type' })]));
  }
});
