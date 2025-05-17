import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// 注册Chart.js组件
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function RiskDashboard({ riskAnalysis }) {
  if (!riskAnalysis) return null;
  
  // 创建环形图数据
  const doughnutData = {
    labels: ['安全', '风险'],
    datasets: [
      {
        data: [riskAnalysis.score, 100 - riskAnalysis.score],
        backgroundColor: ['#4CAF50', '#F44336'],
        hoverBackgroundColor: ['#45a049', '#e53935']
      }
    ]
  };
  
  // 创建各项风险比较柱状图
  const barData = {
    labels: ['流动性风险', '合约风险', '交易风险'],
    datasets: [
      {
        label: '安全评分',
        data: [
          riskAnalysis.details.liquidityRisk.liquidityScore,
          riskAnalysis.details.contractRisk.contractRiskScore,
          riskAnalysis.details.transactionRisk.transactionRiskScore
        ],
        backgroundColor: ['#2196F3', '#FF9800', '#9C27B0']
      }
    ]
  };
  
  const barOptions = {
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  };
  
  // 获取风险等级样式
  const getRiskLevelClass = (level) => {
    switch(level) {
      case "低风险": return "risk-low";
      case "中等风险": return "risk-medium";
      case "高风险": return "risk-high";
      case "极高风险": return "risk-extreme";
      default: return "";
    }
  };
  
  return (
    <div className="risk-dashboard">
      <div className="token-info">
        <h2>{riskAnalysis.tokenInfo.name} ({riskAnalysis.tokenInfo.symbol})</h2>
        <p className="token-address">{riskAnalysis.tokenInfo.address}</p>
      </div>
      
      <div className="overall-score">
        <h2>总体风险评分</h2>
        <div className="score-container">
          <div className="chart-container">
            <Doughnut data={doughnutData} />
          </div>
          <div className="score-details">
            <div className="score-number">{riskAnalysis.score}</div>
            <div className={`risk-level ${getRiskLevelClass(riskAnalysis.riskLevel)}`}>
              {riskAnalysis.riskLevel}
            </div>
          </div>
        </div>
      </div>
      
      <div className="risk-breakdown">
        <h2>风险细分</h2>
        <div className="chart-container bar-chart">
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
      
      <div className="detail-section">
        <h3>合约分析</h3>
        <div className="detail-item">
          <span className="detail-label">开源状态:</span>
          <span className={`detail-value ${riskAnalysis.details.contractRisk.isOpenSource ? 'positive' : 'negative'}`}>
            {riskAnalysis.details.contractRisk.isOpenSource ? '已开源' : '未开源'}
          </span>
        </div>
        {riskAnalysis.details.contractRisk.dangerousFunctions.length > 0 && (
          <div className="detail-item">
            <span className="detail-label">危险函数:</span>
            <span className="detail-value negative">
              {riskAnalysis.details.contractRisk.dangerousFunctions.join(', ')}
            </span>
          </div>
        )}
        <div className="detail-item">
          <span className="detail-label">AI分析:</span>
          <p className="ai-analysis">{riskAnalysis.details.contractRisk.aiAnalysis}</p>
        </div>
      </div>
      
      <div className="detail-section">
        <h3>流动性分析</h3>
        <div className="detail-item">
          <span className="detail-label">流动性(美元):</span>
          <span className="detail-value">${riskAnalysis.details.liquidityRisk.liquidityUSD.toLocaleString()}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">持币集中度:</span>
          <span className={`detail-value ${riskAnalysis.details.liquidityRisk.topHoldersPercent > 70 ? 'negative' : 'positive'}`}>
            前几大地址持有约 {riskAnalysis.details.liquidityRisk.topHoldersPercent}%
          </span>
        </div>
      </div>
      
      <div className="detail-section">
        <h3>交易分析</h3>
        <div className="detail-item">
          <span className="detail-label">近期交易数:</span>
          <span className="detail-value">{riskAnalysis.details.transactionRisk.recentTransactions}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">唯一地址数:</span>
          <span className="detail-value">{riskAnalysis.details.transactionRisk.uniqueAddresses}</span>
        </div>
        {riskAnalysis.details.transactionRisk.suspiciousPatterns.length > 0 && (
          <div className="detail-item">
            <span className="detail-label">可疑模式:</span>
            <span className="detail-value negative">
              {riskAnalysis.details.transactionRisk.suspiciousPatterns.join(', ')}
              </span>
          </div>
        )}
      </div>
      
      <div className="recommendations-section">
        <h3>风险建议</h3>
        <ul className="recommendations-list">
          {riskAnalysis.recommendations.map((rec, index) => (
            <li key={index} className="recommendation-item">{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default RiskDashboard;