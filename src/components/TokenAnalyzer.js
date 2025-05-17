import React, { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

// 替换成你的API密钥
const ETHERSCAN_API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY||"";
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY||""

function TokenAnalyzer({ onAnalysisStart, onAnalysisComplete, onAnalysisError }) {
  const [tokenAddress, setTokenAddress] = useState('');
  const [network, setNetwork] = useState('ethereum');

  // 验证地址是否有效
  const isValidAddress = (address) => {
    return ethers.isAddress(address);
    // return ethers.utils.isAddress(address);
  };

  const handleAnalyze = async () => {
    if (!isValidAddress(tokenAddress)) {
      onAnalysisError(new Error("无效的合约地址"));
      return;
    }

    try {
      onAnalysisStart();
      
      // 1. 获取代币基本信息
      const tokenInfo = await getTokenInfo(tokenAddress, network);
      
      // 2. 分析各种风险
      const liquidityRisk = await analyzeLiquidityRisk(tokenAddress, network);
      const contractRisk = await analyzeContractRisk(tokenInfo.contractInfo);
      const transactionRisk = await analyzeTransactionRisk(tokenAddress, network);
      
      // 3. 计算总体风险
      const overallRisk = calculateOverallRiskScore(liquidityRisk, contractRisk, transactionRisk);
      
      // 4. 添加一些建议
      const recommendations = generateRecommendations(overallRisk);
      
      // 5. 返回分析结果
      onAnalysisComplete({
        tokenInfo,
        ...overallRisk,
        recommendations
      });
      
    } catch (error) {
      console.error("Analysis failed:", error);
      onAnalysisError(error);
    }
  };

  // 获取代币基本信息

  async function getTokenInfo(address, network) {
    // 创建provider
    const provider = new ethers.JsonRpcProvider(
      network === 'ethereum' ? `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_ID}` : 'https://polygon-rpc.com'
    );
    
    // 使用Etherscan API获取合约信息
    const response = await axios.get(
      `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`
    );
    
    // 创建合约实例
    const tokenContract = new ethers.Contract(
      address,
      [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function totalSupply() view returns (uint256)',
        'function decimals() view returns (uint8)'
      ],
      provider
    );
    
    // 获取代币基本信息
    let name, symbol, totalSupply, decimals;
    try {
      name = await tokenContract.name();
      symbol = await tokenContract.symbol();
      totalSupply = await tokenContract.totalSupply();
      decimals = await tokenContract.decimals();
    } catch (error) {
      console.error("Error fetching token info:", error);
      name = "Unknown";
      symbol = "???";
      totalSupply = 0;
      decimals = 18;
    }
    
    return { 
      contractInfo: response.data.result[0], 
      name, 
      symbol, 
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      decimals,
      address
    };
  }

  // 分析流动性风险
  async function analyzeLiquidityRisk(address, network) {
    // 此处简化处理，实际应用中应使用DEX API获取流动性数据
    // 模拟API调用获取价格和流动性数据
    let liquidityUSD = 0;
    let priceUSD = 0;
    
    try {
      // 模拟获取代币价格数据
      // 实际应用中使用CoinGecko、CoinMarketCap或DEX API
      const priceResponse = await axios.get(
        `https://api.coingecko.com/api/v3/simple/token_price/${
          network === 'ethereum' ? 'ethereum' : 'polygon-pos'
        }?contract_addresses=${address}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true`,
        { validateStatus: () => true }
      );
      
      if (priceResponse.status === 200 && priceResponse.data[address.toLowerCase()]) {
        priceUSD = priceResponse.data[address.toLowerCase()].usd || 0;
        const marketCap = priceResponse.data[address.toLowerCase()].usd_market_cap || 0;
        const volume24h = priceResponse.data[address.toLowerCase()].usd_24h_vol || 0;
        
        liquidityUSD = volume24h * 0.1; // 简化估算，实际应从DEX获取
      }
    } catch (error) {
      console.error("Error fetching liquidity data:", error);
    }
    
    // 获取持币地址分布 (简化版)
    let topHoldersPercent = 80; // 默认高集中度
    try {
      const holdersResponse = await axios.get(
        `https://api.etherscan.io/api?module=token&action=tokenholderlist&contractaddress=${address}&page=1&offset=10&apikey=${ETHERSCAN_API_KEY}`,
        { validateStatus: () => true }
      );
      
      if (holdersResponse.status === 200 && holdersResponse.data.status === "1") {
        const holders = holdersResponse.data.result || [];
        topHoldersPercent = calculateTopHoldersPercentage(holders);
      }
    } catch (error) {
      console.error("Error fetching holder data:", error);
    }
    
    // 计算流动性风险分数 (0-100，越高越安全)
    const liquidityScore = calculateLiquidityScore(liquidityUSD, topHoldersPercent);
    
    return {
      liquidityUSD,
      priceUSD,
      topHoldersPercent,
      liquidityScore
    };
  }

  // 计算前10大持有者占比
  function calculateTopHoldersPercentage(holders) {
    // 如果无法获取数据，返回高风险默认值
    if (!holders || holders.length === 0) return 90;
    
    // 模拟计算顶部持有者百分比
    // 实际应用中应计算前10大持有者占总供应量比例
    return Math.min(95, Math.max(10, 100 - holders.length * 2));
  }

  // 计算流动性风险分数
  function calculateLiquidityScore(liquidityUSD, topHoldersPercent) {
    // 流动性分数 (0-100，越高越安全)
    let liquidityScore = 0;
    
    // 基于流动性美元价值评分 (最高50分)
    if (liquidityUSD >= 10000000) liquidityScore += 50;
    else if (liquidityUSD >= 1000000) liquidityScore += 40;
    else if (liquidityUSD >= 500000) liquidityScore += 30;
    else if (liquidityUSD >= 100000) liquidityScore += 20;
    else if (liquidityUSD >= 10000) liquidityScore += 10;
    else liquidityScore += 5;
    
    // 基于持币集中度评分 (最高50分)
    const concentrationScore = Math.max(0, Math.min(50, Math.round(50 * (1 - topHoldersPercent/100))));
    liquidityScore += concentrationScore;
    
    return liquidityScore;
  }

  // 分析合约安全风险
  async function analyzeContractRisk(contractInfo) {
    // 检查合约是否开源
    const isOpenSource = contractInfo.SourceCode !== '';
    
    // 识别危险函数
    let dangerousFunctions = [];
    if (isOpenSource) {
      dangerousFunctions = identifyDangerousFunctions(contractInfo.SourceCode);
    }
    
    // 使用OpenAI API助力风险分析(简化版)
    let aiAnalysis = "未能获取AI分析";
    let aiRiskScore = 50; // 默认中等风险
    
    if (isOpenSource) {
      try {
        const aiResult = await analyzeWithAI(contractInfo.SourceCode);
        aiAnalysis = aiResult.analysis;
        aiRiskScore = aiResult.score;
      } catch (error) {
        console.error("AI analysis error:", error);
      }
    } else {
      aiAnalysis = "合约未开源，无法进行代码分析。这通常是一个高风险信号。";
      aiRiskScore = 20; // 未开源，高风险
    }
    
    // 计算合约风险分数 (0-100，越高越安全)
    const contractRiskScore = calculateContractRiskScore(
      isOpenSource, 
      dangerousFunctions.length,
      aiRiskScore
    );
    
    return {
      isOpenSource,
      dangerousFunctions,
      aiAnalysis,
      aiRiskScore,
      contractRiskScore
    };
  }

  // 识别危险函数
  function identifyDangerousFunctions(sourceCode) {
    // 定义危险函数模式
    const dangerPatterns = [
      { name: "任意铸币", regex: /\b(mint|_mint)\s*\([^)]*\)/i },
      { name: "紧急暂停", regex: /\b(pause|unpause|setPaused)\s*\([^)]*\)/i },
      { name: "权限控制", regex: /\b(onlyOwner|onlyAdmin|require\(\s*owner\s*==\s*msg\.sender\s*\))/i },
      { name: "黑名单", regex: /\b(blacklist|blocklist|ban|freeze)\s*\([^)]*\)/i },
      { name: "手续费修改", regex: /\b(setFee|changeFee|updateFee)\s*\([^)]*\)/i }
    ];
    
    // 检测危险函数
    const found = [];
    for (const pattern of dangerPatterns) {
      if (pattern.regex.test(sourceCode)) {
        found.push(pattern.name);
      }
    }
    
    return found;
  }

  // 使用OpenAI API进行智能分析
  async function analyzeWithAI(contractCode) {
    // 如果代码太长，截取部分以适应API限制
    const codeSample = contractCode.length > 5000 
      ? contractCode.substring(0, 5000) + "...[代码已截断]" 
      : contractCode;
    
    try {
      // 这里使用OpenAI API进行分析（简化版）
      // 实际项目中应将此放在后端以保护API密钥
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "你是一位专业的智能合约安全分析师。分析以下合约代码，识别潜在的风险，包括但不限于：权限控制问题、reentrancy攻击风险、溢出风险、逻辑漏洞等。输出JSON格式，包含analysis(分析结果)和score(1-100的安全分数，越高越安全)。请始终返回中文"
            },
            {
              role: "user",
              content: codeSample || "无法获取合约代码，这是一个未开源合约。"
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 解析返回结果
      const content = response.data.choices[0].message.content;
      let parsedResult;
      
      try {
        // 尝试直接解析JSON
        parsedResult = JSON.parse(content);
      } catch (e) {
        // 如果不是纯JSON，尝试提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedResult = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            // 如果还是失败，使用默认值
            parsedResult = {
              analysis: content,
              score: 50
            };
          }
        } else {
          // 无法提取JSON，使用默认值
          parsedResult = {
            analysis: content,
            score: 50
          };
        }
      }
      
      return {
        analysis: parsedResult.analysis || content,
        score: parsedResult.score || 50
      };
      
    } catch (error) {
      console.error("AI analysis error:", error);
      return {
        analysis: "AI分析未能完成",
        score: 50 // 默认中等风险
      };
    }
  }

  // 计算合约风险分数
  function calculateContractRiskScore(isOpenSource, dangerousFunctionCount, aiRiskScore) {
    // 基础分 (开源加分)
    let score = isOpenSource ? 40 : 10;
    
    // 减去危险函数数量 (每个危险函数减5分，最多减20分)
    score -= Math.min(20, dangerousFunctionCount * 5);
    
    // 加上AI评分 (占60%)
    score += aiRiskScore * 0.6;
    
    // 确保分数在0-100范围内
    return Math.max(0, Math.min(100, score));
  }

  // 分析交易风险
  async function analyzeTransactionRisk(address, network) {
    // 获取近期交易
    let transactions = [];
    try {
      const txResponse = await axios.get(
        `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${address}&page=1&offset=100&sort=desc&apikey=${ETHERSCAN_API_KEY}`
      );
      
      if (txResponse.data.status === "1") {
        transactions = txResponse.data.result || [];
      }
    } catch (error) {
      console.error("Transaction analysis error:", error);
    }
    
    // 分析交易模式
    const txAnalysis = analyzeTransactionPatterns(transactions);
    
    // 计算交易风险分数
    const transactionRiskScore = calculateTransactionRiskScore(txAnalysis);
    
    return {
      recentTransactions: transactions.length,
      uniqueAddresses: txAnalysis.uniqueAddresses,
      largeTransfers: txAnalysis.largeTransfers,
      suspiciousPatterns: txAnalysis.suspiciousPatterns,
      transactionRiskScore
    };
  }

  // 分析交易模式
  function analyzeTransactionPatterns(transactions) {
    // 如果没有交易数据，返回高风险默认值
    if (!transactions || transactions.length === 0) {
      return {
        uniqueAddresses: 0,
        largeTransfers: 0,
        suspiciousPatterns: ["无交易记录"],
        riskLevel: "高"
      };
    }
    
    // 分析唯一地址数
    const addresses = new Set();
    transactions.forEach(tx => {
      addresses.add(tx.from);
      addresses.add(tx.to);
    });
    const uniqueAddresses = addresses.size;
    
    // 查找大额转账 (相对于总量>5%的交易)
    let largeTransfers = 0;
    let suspiciousPatterns = [];
    
    // 这里简化处理，实际应基于代币总量和分布分析
    if (transactions.length > 0) {
      largeTransfers = Math.floor(transactions.length * 0.1); // 假设10%是大额转账
      
      // 检测可疑模式
      if (uniqueAddresses < 10) {
        suspiciousPatterns.push("交易地址极少");
      }
      
      if (transactions.length < 20) {
        suspiciousPatterns.push("交易量异常低");
      }
    }
    
    return {
      uniqueAddresses,
      largeTransfers,
      suspiciousPatterns,
      riskLevel: suspiciousPatterns.length > 0 ? "高" : "低"
    };
  }

  // 计算交易风险分数
  function calculateTransactionRiskScore(txAnalysis) {
    // 基础分数
    let score = 50;
    
    // 根据唯一地址数调整分数
    if (txAnalysis.uniqueAddresses > 100) score += 20;
    else if (txAnalysis.uniqueAddresses > 50) score += 15;
    else if (txAnalysis.uniqueAddresses > 20) score += 10;
    else if (txAnalysis.uniqueAddresses > 10) score += 5;
    else score -= 10;
    
    // 根据可疑模式调整分数
    score -= txAnalysis.suspiciousPatterns.length * 10;
    
    // 确保分数在0-100范围内
    return Math.max(0, Math.min(100, score));
  }

  // 计算总体风险分数
  function calculateOverallRiskScore(liquidityRisk, contractRisk, transactionRisk) {
    // 权重设置
    const weights = {
      liquidity: 0.4,
      contract: 0.4,
      transaction: 0.2
    };
    
    // 综合评分计算
    const overallScore = 
      weights.liquidity * liquidityRisk.liquidityScore +
      weights.contract * contractRisk.contractRiskScore +
      weights.transaction * transactionRisk.transactionRiskScore;
    
    // 风险等级判定
    let riskLevel;
    if (overallScore >= 80) riskLevel = "低风险";
    else if (overallScore >= 60) riskLevel = "中等风险";
    else if (overallScore >= 40) riskLevel = "高风险";
    else riskLevel = "极高风险";
    
    return {
      score: Math.round(overallScore),
      riskLevel,
      details: { liquidityRisk, contractRisk, transactionRisk }
    };
  }

  // 生成风险建议
  function generateRecommendations(riskAnalysis) {
    const recommendations = [];
    const details = riskAnalysis.details;
    
    // 合约风险建议
    if (!details.contractRisk.isOpenSource) {
      recommendations.push("合约未开源，无法验证代码。与未经验证的合约交互存在很高风险。");
    }
    
    if (details.contractRisk.dangerousFunctions.length > 0) {
      recommendations.push(`合约包含高风险函数: ${details.contractRisk.dangerousFunctions.join(", ")}。建议仔细审核这些函数的权限控制。`);
    }
    
    // 流动性风险建议
    if (details.liquidityRisk.liquidityUSD < 100000) {
      recommendations.push("代币流动性不足，可能导致较高的滑点和市场操纵风险。");
    }
    
    if (details.liquidityRisk.topHoldersPercent > 70) {
      recommendations.push("代币高度集中，前几个地址控制了大部分供应量，存在抛售风险。");
    }
    
    // 交易风险建议
    if (details.transactionRisk.suspiciousPatterns.length > 0) {
      recommendations.push(`检测到可疑交易模式: ${details.transactionRisk.suspiciousPatterns.join(", ")}。`);
    }
    
    // 根据总体风险添加建议
    if (riskAnalysis.score < 40) {
      recommendations.push("总体风险极高，强烈建议避免参与此代币。");
    } else if (riskAnalysis.score < 60) {
      recommendations.push("总体风险较高，建议小额参与并密切关注变化。");
    }
    
    // 如果没有具体建议，添加一条通用建议
    if (recommendations.length === 0) {
      recommendations.push("该代币整体风险适中，但仍建议遵循加密资产投资的一般风险管理原则。");
    }
    
    return recommendations;
  }

  return (
    <div className="token-analyzer">
      <div className="input-container">
        <input
          type="text"
          placeholder="输入代币合约地址 (0x...)"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="address-input"
        />
        
        <select 
          value={network} 
          onChange={(e) => setNetwork(e.target.value)}
          className="network-select"
        >
          <option value="ethereum">以太坊</option>
          <option value="polygon">Polygon</option>
        </select>
        
        <button 
          onClick={handleAnalyze} 
          className="analyze-button"
        >
          分析风险
        </button>
      </div>
    </div>
  );
}

export default TokenAnalyzer;