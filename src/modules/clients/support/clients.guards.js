import { CLIENT_TAX_CONDITIONS } from '../../../constants/constants.js';
import { BillingError } from '../../../errors/billing-error.js';

export function assertClientTaxData(data) {
  if (
    data.country === 'AR' &&
    !Object.values(CLIENT_TAX_CONDITIONS).includes(data.taxCondition)
  ) {
    throw new BillingError(
      'Los clientes argentinos requieren condición fiscal.',
      400,
    );
  }
}
