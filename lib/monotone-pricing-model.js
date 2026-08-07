const defaultWallKnots = [0.8, 1.5, 2, 4, 6, 8];

export function fitMonotonePricingModel(samples, {
  surfaceId,
  parameterKeys,
  wallKey = "",
  degree = 3,
  wallKnots = defaultWallKnots
}) {
  const usableSamples = samples.filter((sample) => {
    return Number(sample.productionCostBrl) > 0 && parameterKeys.every((key) => {
      return Number.isFinite(Number(sample.params?.[key]));
    });
  });

  if (usableSamples.length === 0) {
    throw new Error(`Sem amostras validas para ajustar o modelo monotono ${surfaceId}.`);
  }

  const ranges = Object.fromEntries(parameterKeys.map((key) => {
    const values = usableSamples.map((sample) => Number(sample.params[key]));
    return [key, { min: Math.min(...values), max: Math.max(...values) }];
  }));
  const exponents = monomialExponents(parameterKeys.length, degree);
  const effectiveWallKnots = wallKey ? [...wallKnots] : [];
  const contract = {
    surfaceId,
    parameterKeys,
    ranges,
    degree,
    wallKey,
    wallKnots: effectiveWallKnots,
    exponents
  };
  const featureRows = usableSamples.map((sample) => buildFeatureVector(sample.params, contract));
  const targets = usableSamples.map((sample) => Number(sample.productionCostBrl));
  const coefficients = fitNonNegativeLeastSquares(featureRows, targets);

  return {
    ...contract,
    sampleCount: usableSamples.length,
    minimumProductionCostBrl: round(Math.min(...targets), 4),
    coefficients: coefficients.map((coefficient) => round(coefficient, 10))
  };
}

export function predictMonotoneProductionCost(model, params) {
  if (!model?.coefficients?.length) {
    return 0;
  }

  const fittedCost = dotProduct(buildFeatureVector(params, model), model.coefficients);
  return Math.max(Number(model.minimumProductionCostBrl || 0), fittedCost);
}

export function buildFeatureVector(params, model) {
  const normalizedValues = model.parameterKeys.map((key) => {
    const range = model.ranges[key];
    const scale = Math.max(1, Number(range.max) - Number(range.min));
    return Math.max(0, (Number(params?.[key] ?? range.min) - Number(range.min)) / scale);
  });
  const monomials = model.exponents.map((powers) => {
    return powers.reduce((value, power, index) => {
      return value * Math.pow(normalizedValues[index], power);
    }, 1);
  });
  const wallWeights = model.wallKey
    ? piecewiseLinearWeights(Number(params?.[model.wallKey]), model.wallKnots)
    : [1];

  return wallWeights.flatMap((wallWeight) => {
    return monomials.map((monomial) => monomial * wallWeight);
  });
}

export function monomialExponents(dimensionCount, maximumDegree) {
  const result = [];
  const current = Array(dimensionCount).fill(0);

  function visit(index, remainingDegree) {
    if (index === dimensionCount) {
      result.push([...current]);
      return;
    }

    for (let power = 0; power <= remainingDegree; power += 1) {
      current[index] = power;
      visit(index + 1, remainingDegree - power);
    }
  }

  visit(0, maximumDegree);
  return result;
}

function piecewiseLinearWeights(value, knots) {
  if (knots.length === 0) {
    return [1];
  }
  if (!Number.isFinite(value) || value <= knots[0]) {
    return knots.map((_, index) => (index === 0 ? 1 : 0));
  }
  if (value >= knots.at(-1)) {
    return knots.map((_, index) => (index === knots.length - 1 ? 1 : 0));
  }

  const weights = knots.map(() => 0);
  const rightIndex = knots.findIndex((knot) => knot >= value);
  const leftIndex = rightIndex - 1;
  const span = knots[rightIndex] - knots[leftIndex];
  const rightWeight = (value - knots[leftIndex]) / span;
  weights[leftIndex] = 1 - rightWeight;
  weights[rightIndex] = rightWeight;
  return weights;
}

function fitNonNegativeLeastSquares(featureRows, targets, maximumIterations = 100) {
  const featureCount = featureRows[0]?.length || 0;
  const coefficients = Array(featureCount).fill(0);
  const residuals = [...targets];
  const columns = Array.from({ length: featureCount }, (_, featureIndex) => {
    return featureRows.map((row) => Number(row[featureIndex] || 0));
  });
  const ridge = 1e-5;

  for (let iteration = 0; iteration < maximumIterations; iteration += 1) {
    let largestChange = 0;

    for (let featureIndex = 0; featureIndex < featureCount; featureIndex += 1) {
      const column = columns[featureIndex];
      const previous = coefficients[featureIndex];
      let numerator = 0;
      let denominator = ridge;

      for (let rowIndex = 0; rowIndex < column.length; rowIndex += 1) {
        const value = column[rowIndex];
        numerator += value * (residuals[rowIndex] + value * previous);
        denominator += value * value;
      }

      const next = Math.max(0, numerator / denominator);
      const change = next - previous;
      if (Math.abs(change) <= 1e-12) {
        continue;
      }

      coefficients[featureIndex] = next;
      largestChange = Math.max(largestChange, Math.abs(change));
      for (let rowIndex = 0; rowIndex < column.length; rowIndex += 1) {
        residuals[rowIndex] -= column[rowIndex] * change;
      }
    }

    if (largestChange < 1e-8) {
      break;
    }
  }

  return coefficients;
}

function dotProduct(left, right) {
  return left.reduce((sum, value, index) => sum + value * Number(right[index] || 0), 0);
}

function round(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(Number(value || 0) * factor) / factor;
}
