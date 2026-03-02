"""
Mathematical utility functions for supply chain calculations.
Implements formulas from PROJECT_OVERVIEW.md Section 6 (Advanced Mathematics).
"""

import math
import numpy as np
from typing import Optional


# ============================================================
# 1. Reorder Point (ROP) Formula & Advanced Math
#    ROP = μ_d × L + Z × σ_d × √L
# ============================================================

def compute_classic_eoq(annual_demand: float, order_cost: float, holding_cost_per_unit: float) -> float:
    """
    Compute Economic Order Quantity (EOQ).
    Formula: sqrt((2 * D * S) / H)
    """
    if holding_cost_per_unit <= 0 or annual_demand <= 0 or order_cost <= 0:
        return 0.0
    eoq = math.sqrt((2 * annual_demand * order_cost) / holding_cost_per_unit)
    return round(eoq, 2)

def compute_z_score_safety_stock(
    lead_time_days: float, 
    demand_std_dev: float, 
    service_level_z: float = 1.65
) -> float:
    """
    Compute Safety Stock using Z-Score.
    Formula: Z * std_dev * sqrt(lead_time)
    """
    lead_time = max(lead_time_days, 1.0)
    std_dev = max(demand_std_dev, 0.0)
    safety_stock = service_level_z * std_dev * math.sqrt(lead_time)
    return round(safety_stock, 2)

def compute_reorder_point(
    avg_daily_demand: float,
    lead_time_days: float,
    demand_std_dev: float,
    service_level_z: float = 1.65  # ~95% service level
) -> float:
    """
    Compute Reorder Point accounting for demand uncertainty.
    
    Args:
        avg_daily_demand: μ_d — average daily demand
        lead_time_days: L — supplier lead time in days
        demand_std_dev: σ_d — standard deviation of daily demand
        service_level_z: Z — service level factor (default 1.65 for 95%)
    
    Returns:
        Reorder point quantity
    
    Edge cases:
        - lead_time_days <= 0: returns avg_daily_demand (minimum 1 day)
        - demand_std_dev <= 0: ignores safety buffer
        - avg_daily_demand <= 0: returns 0
    """
    if avg_daily_demand <= 0:
        return 0.0

    lead_time = max(lead_time_days, 1.0)
    std_dev = max(demand_std_dev, 0.0)

    rop = (avg_daily_demand * lead_time) + (service_level_z * std_dev * math.sqrt(lead_time))
    return round(rop, 2)


# ============================================================
# 2. Reorder Quantity
#    reorder_qty = (avg_daily_demand × lead_time) + safety_stock - on_hand
# ============================================================

def compute_reorder_quantity(
    avg_daily_demand: float,
    lead_time_days: float,
    safety_stock: float,
    on_hand: float
) -> float:
    """
    Compute how much to reorder.
    
    Returns:
        Reorder quantity (0 if no reorder needed)
    
    Edge cases:
        - Negative on_hand: treated as 0 (flagged separately as anomaly)
        - Result < 0: returns 0 (no reorder needed)
    """
    effective_on_hand = max(on_hand, 0)
    lead_time = max(lead_time_days, 1.0)
    demand = max(avg_daily_demand, 0)

    qty = (demand * lead_time) + safety_stock - effective_on_hand
    return round(max(qty, 0), 2)


# ============================================================
# 3. Days Until Stockout
# ============================================================

def compute_days_until_stockout(
    on_hand: float,
    avg_daily_demand: float
) -> Optional[float]:
    """
    Estimate days until stock runs out.
    
    Returns:
        Days until stockout, or None if demand is zero/negative
    
    Edge cases:
        - on_hand <= 0: returns 0 (already stocked out)
        - avg_daily_demand <= 0: returns None (cannot estimate)
    """
    if avg_daily_demand <= 0:
        return None
    if on_hand <= 0:
        return 0.0
    return round(on_hand / avg_daily_demand, 1)


# ============================================================
# 4. Supplier Scoring (Multi-Objective Optimization)
#    Score = w1×Cost + w2×Reliability + w3×Speed + w4×Quality
# ============================================================

def compute_supplier_score(
    cost_index: float,
    on_time_rate: float,
    lead_time: float,
    quality_score: float,
    weights: dict = None,
    is_urgent: bool = False
) -> float:
    """
    Multi-criteria weighted supplier score.
    
    Args:
        cost_index: Lower is better (will be inverted)
        on_time_rate: 0-1 scale, higher is better
        lead_time: Days, lower is better (will be inverted)
        quality_score: 0-1 scale, higher is better
        weights: Custom weights dict {cost, reliability, speed, quality}
        is_urgent: Shifts priority to speed
    
    Returns:
        Composite score 0-100 (higher = better supplier)
    """
    if not weights:
        if is_urgent:
            w = {"cost": 0.10, "reliability": 0.35, "speed": 0.45, "quality": 0.10}
        else:
            w = {"cost": 0.40, "reliability": 0.30, "speed": 0.10, "quality": 0.20}
    else:
        w = weights

    # Normalize: higher is better for all dimensions
    # Cost: invert (lower cost = higher score)
    cost_score = max(0, 1.0 - (cost_index / 100.0)) if cost_index and cost_index > 0 else 0.5
    
    # Reliability: already 0-1 (higher is better)
    reliability_score = on_time_rate if on_time_rate is not None else 0.0
    
    # Speed: invert lead time (lower = better). Normalize to 0-1 assuming max 90 days
    speed_score = max(0, 1.0 - (lead_time / 90.0)) if lead_time and lead_time > 0 else 0.5
    
    # Quality: already 0-1
    quality_score_val = quality_score if quality_score is not None else 0.0

    composite = (
        w["cost"] * cost_score +
        w["reliability"] * reliability_score +
        w["speed"] * speed_score +
        w["quality"] * quality_score_val
    )

    return round(composite * 100, 2)


# ============================================================
# 5. Risk Score Model
#    Risk = P(Event) × Impact
# ============================================================

def compute_risk_score(
    probability: float,
    impact: float
) -> float:
    """
    Compute risk score.
    
    Args:
        probability: 0.0 to 1.0
        impact: 0.0 to 10.0 scale
    
    Returns:
        Risk score 0-10
    
    Edge cases:
        - Values out of range: clamped
    """
    p = max(0.0, min(1.0, probability))
    i = max(0.0, min(10.0, impact))
    return round(p * i, 2)


# ============================================================
# 6. Stockout Risk Probability
# ============================================================

def compute_stockout_probability(
    on_hand: float,
    avg_daily_demand: float,
    lead_time_days: float,
    demand_std_dev: float = 0.0
) -> float:
    """
    Estimate probability of stockout during lead time.
    
    Uses normal distribution approximation.
    
    Returns:
        Probability 0.0 to 1.0
    """
    if avg_daily_demand <= 0:
        return 0.0
    if on_hand <= 0:
        return 1.0

    lead_time = max(lead_time_days, 1.0)
    demand_during_lead = avg_daily_demand * lead_time

    if demand_std_dev <= 0:
        # Deterministic: will we run out?
        return 1.0 if on_hand < demand_during_lead else 0.0

    std_during_lead = demand_std_dev * math.sqrt(lead_time)
    if std_during_lead <= 0:
        return 1.0 if on_hand < demand_during_lead else 0.0

    # Z-score: how many std devs above expected demand is our stock?
    z = (on_hand - demand_during_lead) / std_during_lead

    # Approximate CDF using error function
    # P(stockout) = P(demand > on_hand) = 1 - Φ(z)
    p_sufficient = 0.5 * (1.0 + math.erf(z / math.sqrt(2)))
    return round(1.0 - p_sufficient, 4)


# ============================================================
# 7. Demand Volatility Index
#    Volatility = σ / μ  (Coefficient of Variation)
# ============================================================

def compute_demand_volatility(
    demand_values: list
) -> Optional[float]:
    """
    Compute demand volatility (coefficient of variation).
    
    Args:
        demand_values: List of demand observations
    
    Returns:
        Volatility index, or None if insufficient data
    
    Edge cases:
        - Empty list: returns None
        - All zeros: returns 0
        - Mean of 0: returns None (division by zero)
    """
    if not demand_values or len(demand_values) < 2:
        return None

    arr = np.array(demand_values, dtype=float)
    mean = np.mean(arr)
    std = np.std(arr, ddof=1)  # sample std dev

    if mean <= 0:
        return None

    return round(float(std / mean), 4)


# ============================================================
# 8. Demand Anomaly Detection
#    if demand > 5× rolling average → anomaly
# ============================================================

def detect_demand_anomaly(
    current_demand: float,
    historical_demands: list,
    multiplier: float = 5.0
) -> dict:
    """
    Detect if current demand is anomalous.
    
    Args:
        current_demand: Current period demand value
        historical_demands: Past demand values for rolling average
        multiplier: Threshold multiplier (default 5×)
    
    Returns:
        Dict with is_anomaly, rolling_avg, threshold, ratio
    """
    if not historical_demands:
        return {
            "is_anomaly": False,
            "rolling_avg": None,
            "threshold": None,
            "ratio": None,
            "message": "Insufficient historical data for anomaly detection"
        }

    rolling_avg = float(np.mean(historical_demands))

    if rolling_avg <= 0:
        return {
            "is_anomaly": current_demand > 0,
            "rolling_avg": rolling_avg,
            "threshold": 0,
            "ratio": None,
            "message": "Rolling average is zero; any positive demand is unusual"
        }

    threshold = rolling_avg * multiplier
    ratio = current_demand / rolling_avg

    return {
        "is_anomaly": current_demand > threshold,
        "rolling_avg": round(rolling_avg, 2),
        "threshold": round(threshold, 2),
        "ratio": round(ratio, 2),
        "message": "Anomaly detected" if current_demand > threshold else "Normal"
    }


# ============================================================
# 9. Delay Prediction Heuristic
#    Delay = BaseDelay + WeatherFactor + CongestionFactor
# ============================================================

def predict_delay(
    carrier_avg_delay: float = 0.0,
    weather_factor: float = 0.0,
    congestion_factor: float = 0.0
) -> dict:
    """
    Predict shipment delay.
    
    Returns:
        Dict with predicted_delay_days and severity level
    """
    delay = max(0, carrier_avg_delay + weather_factor + congestion_factor)

    if delay <= 1:
        severity = "low"
    elif delay <= 3:
        severity = "medium"
    elif delay <= 7:
        severity = "high"
    else:
        severity = "critical"

    return {
        "predicted_delay_days": round(delay, 1),
        "severity": severity,
        "components": {
            "carrier_avg_delay": carrier_avg_delay,
            "weather_factor": weather_factor,
            "congestion_factor": congestion_factor,
        }
    }
