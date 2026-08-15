import pytest
from app.services.strategy_builder_service import StrategyBuilderService

def test_validate_node_graph():
    nodes = [
        {"id": "n1", "type": "INDICATOR", "label": "EMA 20"},
        {"id": "n2", "type": "ORDER", "label": "Market Buy"},
    ]
    edges = [{"source": "n1", "target": "n2"}]
    errors = StrategyBuilderService.validate_node_graph(nodes, edges)
    # Should warn about missing risk node
    assert len(errors) == 1
    assert errors[0]["type"] == "MISSING_RISK"

def test_ai_generate_strategy():
    strategy = StrategyBuilderService.ai_generate_strategy("Create a Gold breakout strategy with ATR trailing stop")
    assert "Gold" in strategy["name"] or "AI" in strategy["name"]
    assert len(strategy["nodes"]) >= 4
    assert len(strategy["edges"]) >= 3

def test_ai_improve_strategy():
    nodes = [
        {"id": "n1", "type": "RISK", "data": {"sl_pct": 2.0}},
        {"id": "n2", "type": "INDICATOR", "label": "EMA 20", "data": {"period": 20}},
    ]
    edges = [{"source": "n1", "target": "n2"}]
    improved = StrategyBuilderService.ai_improve_strategy(nodes, edges)
    assert len(improved["suggestions"]) > 0
    assert improved["improved_nodes"][0]["data"]["sl_pct"] == 1.2

def test_generate_strategy_code():
    nodes = [{"id": "n1", "type": "INDICATOR"}]
    edges = []
    
    pine_code = StrategyBuilderService.generate_strategy_code(nodes, edges, "Pine Script v6")
    assert "//@version=6" in pine_code
    assert "strategy(" in pine_code

    python_code = StrategyBuilderService.generate_strategy_code(nodes, edges, "Python")
    assert "import backtrader as bt" in python_code

    mql5_code = StrategyBuilderService.generate_strategy_code(nodes, edges, "MQL5")
    assert "#property" in mql5_code

def test_import_code_to_graph():
    code = "//@version=6\nstrategy('Test')"
    graph = StrategyBuilderService.import_code_to_graph(code, "Pine Script v6")
    assert len(graph["nodes"]) > 0
    assert len(graph["edges"]) > 0

def test_run_parameter_optimization():
    nodes = [{"id": "n1"}]
    edges = []
    results = StrategyBuilderService.run_parameter_optimization(nodes, edges, method="Grid Search")
    assert len(results) > 0
    assert "fast_period" in results[0]
    assert "win_rate" in results[0]
