import React, { useState } from 'react';
import './App.css';
import TokenAnalyzer from './components/TokenAnalyzer';
import RiskDashboard from './components/RiskDashboard';

function App() {
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalysisComplete = (result) => {
    setRiskAnalysis(result);
    setLoading(false);
  };

  const handleAnalysisError = (err) => {
    setError(err.message);
    setLoading(false);
  };

  const handleStartAnalysis = () => {
    setLoading(true);
    setError(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>代币风险评分器</h1>
        <p>输入代币合约地址，获取AI驱动的风险评估</p>
      </header>
      
      <main>
        <TokenAnalyzer 
          onAnalysisStart={handleStartAnalysis}
          onAnalysisComplete={handleAnalysisComplete} 
          onAnalysisError={handleAnalysisError}
        />
        
        {loading && <div className="loading">分析中，请稍候...</div>}
        {!loading&&error && <div className="error">错误: {error}</div>}
        
        {!loading&&riskAnalysis && <RiskDashboard riskAnalysis={riskAnalysis} />}
      </main>
    </div>
  );
}

export default App;