import math
from typing import Dict, Any

def norm_cdf(x: float) -> float:
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0

def norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)

def calculate_black_scholes(
    S: float,        # Underlying Price
    K: float,        # Strike Price
    T: float,        # Time to Expiration (Years)
    r: float,        # Risk-free rate (e.g., 0.05)
    sigma: float,    # Implied Volatility (e.g., 0.25)
    option_type: str = "call"
) -> Dict[str, float]:
    """Mathematical Black-Scholes pricing engine with 1st & 2nd order Greeks."""
    S = max(0.01, float(S))
    K = max(0.01, float(K))
    T = max(1e-5, float(T))
    r = float(r)
    sigma = max(0.001, float(sigma))
    is_call = option_type.lower() == "call"

    d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    pdf_d1 = norm_pdf(d1)
    cdf_d1 = norm_cdf(d1)
    cdf_d2 = norm_cdf(d2)
    cdf_neg_d1 = norm_cdf(-d1)
    cdf_neg_d2 = norm_cdf(-d2)

    if is_call:
        price = S * cdf_d1 - K * math.exp(-r * T) * cdf_d2
        delta = cdf_d1
        theta = (- (S * pdf_d1 * sigma) / (2 * math.sqrt(T)) - r * K * math.exp(-r * T) * cdf_d2) / 365.0
        rho = (K * T * math.exp(-r * T) * cdf_d2) / 100.0
        intrinsic_val = max(0.0, S - K)
    else:
        price = K * math.exp(-r * T) * cdf_neg_d2 - S * cdf_neg_d1
        delta = cdf_d1 - 1.0
        theta = (- (S * pdf_d1 * sigma) / (2 * math.sqrt(T)) + r * K * math.exp(-r * T) * cdf_neg_d2) / 365.0
        rho = (-K * T * math.exp(-r * T) * cdf_neg_d2) / 100.0
        intrinsic_val = max(0.0, K - S)

    extrinsic_val = max(0.0, price - intrinsic_val)
    gamma = pdf_d1 / (S * sigma * math.sqrt(T))
    vega = (S * pdf_d1 * math.sqrt(T)) / 100.0

    charm = (-pdf_d1 * (2 * r * T - d2 * sigma * math.sqrt(T)) / (2 * T * sigma * math.sqrt(T))) / 365.0
    if not is_call:
        charm += (r * math.exp(-r * T)) / 365.0

    vomma = (vega * d1 * d2) / sigma
    vanna = (-pdf_d1 * d2) / sigma
    breakeven = (K + price) if is_call else (K - price)

    return {
        "price": round(max(0.01, price), 2),
        "intrinsic_value": round(intrinsic_val, 2),
        "extrinsic_value": round(extrinsic_val, 2),
        "breakeven": round(breakeven, 2),
        "delta": round(delta, 4),
        "gamma": round(gamma, 4),
        "theta": round(theta, 4),
        "vega": round(vega, 4),
        "rho": round(rho, 4),
        "charm": round(charm, 4),
        "vomma": round(vomma, 4),
        "vanna": round(vanna, 4)
    }
