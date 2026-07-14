export function normalizeBrTaxDocument(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatBrTaxDocument(value) {
  const digits = normalizeBrTaxDocument(value);

  if (digits.length > 14) {
    return digits;
  }

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function isValidBrTaxDocument(value) {
  const digits = normalizeBrTaxDocument(value);

  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

export function getBrTaxDocumentValidationMessage(value, { required = false } = {}) {
  const digits = normalizeBrTaxDocument(value);

  if (!digits) {
    return required ? "Informe o CPF ou CNPJ para a emissão da nota fiscal." : "";
  }

  if (digits.length !== 11 && digits.length !== 14) {
    return "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos.";
  }

  if (!isValidBrTaxDocument(digits)) {
    const documentType = digits.length === 11 ? "CPF" : "CNPJ";
    return `${documentType} inválido. Confira os números informados.`;
  }

  return "";
}

function isValidCpf(digits) {
  if (/^(\d)\1{10}$/.test(digits)) return false;

  return [9, 10].every((length) => {
    const weightStart = length + 1;
    const sum = digits
      .slice(0, length)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (weightStart - index), 0);
    const expectedDigit = ((sum * 10) % 11) % 10;

    return expectedDigit === Number(digits[length]);
  });
}

function isValidCnpj(digits) {
  if (/^(\d)\1{13}$/.test(digits)) return false;

  return [12, 13].every((length) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = digits
      .slice(0, length)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    const expectedDigit = remainder < 2 ? 0 : 11 - remainder;

    return expectedDigit === Number(digits[length]);
  });
}
