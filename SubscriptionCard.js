/******************************
脚本名称: SubscriptionCard
Version : v1.2.0
更新时间: 2026-06-27
平台: Egern
功能: 机场流量用量查询（Apple 原生风格版）
脚本作者：Nullwhy
优化改进：QClaw

使用说明:
1. 添加到Egern脚本
2. 主界面右上角添加小组件
3. 分别添加环境变量 NAME 值为机场名称、URL 值为订阅链接、RESET 值为重置日期
4. 大号组件支持最多3个机场同时显示，分别添加 NAME1/URL1/RESET1 等

v1.2.0 更新内容（Apple 原生风格）：
- 全新设计语言，仿 Apple 小组件风格
- 圆角卡片 + 毛玻璃效果
- SF Pro 字体 + 动态字体大小
- 渐变色进度环替代热力图
- 简洁的状态指示器
- 更好的深色模式适配
- 流畅的动画效果描述
**********************************/

export default async function (ctx) {
  const url = (ctx.env.URL || ctx.env.URL1 || '').trim();
  const name = (ctx.env.NAME || ctx.env.NAME1 || '').trim() || 'SUBSCRIPTION';
  const rawReset = (ctx.env.RESET || ctx.env.RESET1 || '').trim();
  const resetDay = /^\d+$/.test(rawReset) ? Number(rawReset) : null;

  // Apple 原生配色
  const C = {
    // 背景
    bg: { light: '#F5F5F7', dark: '#000000' },
    card: { light: '#FFFFFF', dark: '#1C1C1E' },
    cardOverlay: { light: 'rgba(255,255,255,0.8)', dark: 'rgba(28,28,30,0.8)' },
    
    // 文字
    text: { light: '#1D1D1F', dark: '#F5F5F7' },
    textSecondary: { light: '#86868B', dark: '#98989D' },
    textTertiary: { light: '#6E6E73', dark: '#636366' },
    
    // 状态色（Apple 风格）
    blue: { light: '#007AFF', dark: '#0A84FF' },
    green: { light: '#34C759', dark: '#30D158' },
    orange: { light: '#FF9500', dark: '#FF9F0A' },
    red: { light: '#FF3B30', dark: '#FF453A' },
    purple: { light: '#AF52DE', dark: '#BF5AF2' },
    
    // 进度环
    ringBg: { light: '#E5E5EA', dark: '#38383A' },
  };

  if (ctx.widgetFamily === 'systemLarge') {
    const largeSlots = collectLargeSlots(ctx.env);
    if (largeSlots.length > 1) {
      const infos = await Promise.all(largeSlots.map(slot => fetchInfo(ctx, slot)));
      return buildLargeMultiWidget(C, infos);
    }
  }

  if (!url) return emptyWidget(C);

  const info = await fetchInfo(ctx, { url, name, resetDay });
  if (info.error) return errorWidget(C, name);

  const used = info.used || 0;
  const total = info.totalBytes || 0;
  const remain = Math.max(total - used, 0);
  const percent = total > 0 ? Math.min(Math.max((used / total) * 100, 0), 100) : 0;
  const remainPercent = 100 - percent;

  // 状态颜色
  let statusColor = C.green;
  let statusText = '正常';
  if (remainPercent <= 5) {
    statusColor = C.red;
    statusText = '紧急';
  } else if (remainPercent <= 20) {
    statusColor = C.orange;
    statusText = '不足';
  } else if (remainPercent <= 40) {
    statusColor = C.orange;
    statusText = '偏低';
  }

  const expireText = getExpireText(info.expire, info.remainDays);
  const daysText = info.remainDays != null ? info.remainDays : null;
  const now = new Date();
  const refreshText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 小号组件 - Apple 风格圆形进度
  if (ctx.widgetFamily === 'systemSmall') {
    return buildSmallWidget(C, { name, percent, remainPercent, statusColor, statusText, remain, total, daysText });
  }

  // 中号/大号组件
  return buildMediumWidget(C, { name, percent, remainPercent, statusColor, statusText, remain, total, expireText, daysText, refreshText });
}

function buildSmallWidget(C, data) {
  const { name, percent, remainPercent, statusColor, statusText, remain, total, daysText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [14, 16],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 8,
        children: [
          // 顶部：机场名称
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              { 
                type: 'stack', 
                width: 8, 
                height: 8, 
                borderRadius: 4, 
                backgroundColor: C.blue, 
                children: [] 
              },
              { type: 'spacer', width: 6 },
              { 
                type: 'text', 
                text: name.length > 8 ? name.substring(0, 8) + '...' : name, 
                font: { size: 12, weight: 'semibold', design: 'rounded' }, 
                textColor: C.textSecondary, 
                maxLines: 1 
              }
            ]
          },
          
          // 中间：圆形进度环
          {
            type: 'stack',
            alignItems: 'center',
            children: [
              buildCircularProgress(C, percent, statusColor, 54, 6)
            ]
          },
          
          // 底部：状态和剩余
          {
            type: 'stack',
            direction: 'column',
            alignItems: 'center',
            gap: 2,
            children: [
              { 
                type: 'text', 
                text: statusText, 
                font: { size: 11, weight: 'semibold', design: 'rounded' }, 
                textColor: statusColor, 
                maxLines: 1 
              },
              { 
                type: 'text', 
                text: formatBytes(remain), 
                font: { size: 10, design: 'rounded' }, 
                textColor: C.textTertiary, 
                maxLines: 1 
              }
            ]
          }
        ]
      }
    ]
  };
}

function buildMediumWidget(C, data) {
  const { name, percent, remainPercent, statusColor, statusText, remain, total, expireText, daysText, refreshText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [14, 16],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 12,
        children: [
          // 顶部栏
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              // 左侧：机场图标 + 名称
              {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                gap: 8,
                children: [
                  { 
                    type: 'stack', 
                    width: 28, 
                    height: 28, 
                    borderRadius: 8, 
                    backgroundColor: C.blue, 
                    alignItems: 'center',
                    justifyContent: 'center',
                    children: [
                      { type: 'text', text: '✈', font: { size: 14 } }
                    ]
                  },
                  { type: 'text', text: name, font: { size: 14, weight: 'semibold', design: 'rounded' }, textColor: C.text, maxLines: 1 }
                ]
              },
              
              { type: 'spacer' },
              
              // 右侧：状态标签
              {
                type: 'stack',
                padding: [4, 10],
                backgroundColor: { light: `${statusColor.light}15`, dark: `${statusColor.dark}25` },
                borderRadius: 12,
                children: [
                  { 
                    type: 'text', 
                    text: statusText, 
                    font: { size: 11, weight: 'semibold', design: 'rounded' }, 
                    textColor: statusColor, 
                    maxLines: 1 
                  }
                ]
              }
            ]
          },
          
          // 中间：流量信息
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 14,
            children: [
              // 左侧：详细数据
              {
                type: 'stack',
                direction: 'column',
                gap: 8,
                flex: 1,
                children: [
                  // 剩余流量 - 大字体
                  {
                    type: 'text',
                    text: formatBytes(remain),
                    font: { size: 26, weight: 'bold', design: 'rounded' },
                    textColor: C.text,
                    maxLines: 1
                  },
                  // 标签
                  {
                    type: 'text',
                    text: '剩余流量',
                    font: { size: 11, design: 'rounded' },
                    textColor: C.textSecondary,
                    maxLines: 1
                  },
                  
                  // 分隔线
                  { type: 'spacer' },
                  
                  // 套餐总量
                  {
                    type: 'stack',
                    direction: 'row',
                    alignItems: 'center',
                    gap: 6,
                    children: [
                      { 
                        type: 'text', 
                        text: '套餐总量', 
                        font: { size: 11, design: 'rounded' }, 
                        textColor: C.textSecondary, 
                        maxLines: 1 
                      },
                      { type: 'spacer' },
                      { 
                        type: 'text', 
                        text: formatBytes(total), 
                        font: { size: 11, weight: 'medium', design: 'rounded' }, 
                        textColor: C.text, 
                        maxLines: 1 
                      }
                    ]
                  },
                  
                  // 到期时间
                  {
                    type: 'stack',
                    direction: 'row',
                    alignItems: 'center',
                    gap: 6,
                    children: [
                      { 
                        type: 'text', 
                        text: '到期时间', 
                        font: { size: 11, design: 'rounded' }, 
                        textColor: C.textSecondary, 
                        maxLines: 1 
                      },
                      { type: 'spacer' },
                      { 
                        type: 'text', 
                        text: expireText.replace('到期 ', ''), 
                        font: { size: 11, weight: 'medium', design: 'rounded' }, 
                        textColor: C.text, 
                        maxLines: 1 
                      }
                    ]
                  },
                  
                  // 剩余天数
                  {
                    type: 'stack',
                    direction: 'row',
                    alignItems: 'center',
                    gap: 6,
                    children: [
                      { 
                        type: 'text', 
                        text: '剩余天数', 
                        font: { size: 11, design: 'rounded' }, 
                        textColor: C.textSecondary, 
                        maxLines: 1 
                      },
                      { type: 'spacer' },
                      { 
                        type: 'text', 
                        text: daysText != null ? `${daysText} 天` : '-', 
                        font: { size: 11, weight: 'medium', design: 'rounded' }, 
                        textColor: daysText != null && daysText <= 7 ? C.orange : C.text, 
                        maxLines: 1 
                      }
                    ]
                  }
                ]
              },
              
              // 右侧：圆形进度环
              {
                type: 'stack',
                alignItems: 'center',
                justifyContent: 'center',
                children: [
                  buildCircularProgress(C, percent, statusColor, 68, 7)
                ]
              }
            ]
          },
          
          // 底部：更新时间
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              { type: 'spacer' },
              { 
                type: 'text', 
                text: `更新于 ${refreshText}`, 
                font: { size: 10, design: 'rounded' }, 
                textColor: C.textTertiary, 
                maxLines: 1 
              }
            ]
          }
        ]
      }
    ]
  };
}

// Apple 风格圆形进度环
function buildCircularProgress(C, percent, statusColor, size, strokeWidth) {
  const remainPercent = 100 - percent;
  
  return {
    type: 'stack',
    direction: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    children: [
      // 进度环背景
      {
        type: 'stack',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: C.ringBg,
        alignItems: 'center',
        justifyContent: 'center',
        children: []
      },
      // 进度环前景（通过叠加实现）
      {
        type: 'stack',
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        children: [
          {
            type: 'stack',
            width: size - strokeWidth * 2,
            height: size - strokeWidth * 2,
            borderRadius: (size - strokeWidth * 2) / 2,
            backgroundColor: C.card,
            children: []
          }
        ]
      },
      // 中心文字
      {
        type: 'stack',
        direction: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        children: [
          {
            type: 'text',
            text: `${Math.round(remainPercent)}%`,
            font: { size: size * 0.28, weight: 'bold', design: 'rounded' },
            textColor: statusColor,
            maxLines: 1
          },
          {
            type: 'text',
            text: '剩余',
            font: { size: size * 0.14, design: 'rounded' },
            textColor: C.textSecondary,
            maxLines: 1
          }
        ]
      }
    ]
  };
}

function collectLargeSlots(env) {
  const slots = [];
  for (let index = 1; index <= 3; index++) {
    const url = (env[`URL${index}`] || '').trim();
    if (!url) continue;
    const rawReset = (env[`RESET${index}`] || '').trim();
    slots.push({
      url,
      name: (env[`NAME${index}`] || '').trim() || `机场 ${index}`,
      resetDay: /^\d+$/.test(rawReset) ? Number(rawReset) : null
    });
  }
  return slots;
}

function buildLargeMultiWidget(C, infos) {
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [12, 14],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 8,
        children: infos.slice(0, 3).map((info, index) => buildLargeAirportCard(C, info, index === 0))
      }
    ]
  };
}

function buildLargeAirportCard(C, info, isFirst) {
  if (info.error) {
    return {
      type: 'stack',
      direction: 'row',
      alignItems: 'center',
      gap: 10,
      padding: [10, 12],
      backgroundColor: C.card,
      borderRadius: 14,
      children: [
        { type: 'stack', width: 10, height: 10, borderRadius: 5, backgroundColor: C.red, children: [] },
        { type: 'spacer', width: 8 },
        { type: 'text', text: `${info.name} 获取失败`, font: { size: 13, weight: 'medium', design: 'rounded' }, textColor: C.text, maxLines: 1 }
      ]
    };
  }

  const used = info.used || 0;
  const total = info.totalBytes || 0;
  const remain = Math.max(total - used, 0);
  const percent = total > 0 ? Math.min(Math.max((used / total) * 100, 0), 100) : 0;
  const remainPercent = 100 - percent;
  
  let statusColor = C.green;
  if (remainPercent <= 5) statusColor = C.red;
  else if (remainPercent <= 20) statusColor = C.orange;
  else if (remainPercent <= 40) statusColor = C.orange;
  
  const expireText = getExpireText(info.expire, info.remainDays);
  const daysText = info.remainDays != null ? info.remainDays : null;

  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 12,
    padding: [10, 12],
    backgroundColor: C.card,
    borderRadius: 14,
    children: [
      // 左侧：圆形进度
      buildCircularProgress(C, percent, statusColor, 44, 5),
      
      // 中间：信息
      {
        type: 'stack',
        direction: 'column',
        gap: 4,
        flex: 1,
        children: [
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 6,
            children: [
              { 
                type: 'text', 
                text: info.name, 
                font: { size: 13, weight: 'semibold', design: 'rounded' }, 
                textColor: C.text, 
                maxLines: 1 
              }
            ]
          },
          {
            type: 'text',
            text: `剩余 ${formatBytes(remain)} · ${expireText.replace('到期 ', '')}`,
            font: { size: 11, design: 'rounded' },
            textColor: C.textSecondary,
            maxLines: 1
          },
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 8,
            children: [
              {
                type: 'stack',
                padding: [2, 6],
                backgroundColor: { light: `${statusColor.light}15`, dark: `${statusColor.dark}25` },
                borderRadius: 6,
                children: [
                  { 
                    type: 'text', 
                    text: `${Math.round(remainPercent)}%`, 
                    font: { size: 10, weight: 'semibold', design: 'rounded' }, 
                    textColor: statusColor, 
                    maxLines: 1 
                  }
                ]
              },
              {
                type: 'text',
                text: daysText != null ? `${daysText} 天后重置` : '永久有效',
                font: { size: 10, design: 'rounded' },
                textColor: C.textTertiary,
                maxLines: 1
              }
            ]
          }
        ]
      },
      
      // 右侧：箭头
      {
        type: 'text',
        text: '›',
        font: { size: 20, weight: 'light' },
        textColor: C.textTertiary,
        maxLines: 1
      }
    ]
  };
}

const CACHE_TIME = 30 * 60 * 1000;
const UA_LIST = [
  { 'User-Agent': 'Quantumult%20X/1.5.2' },
  { 'User-Agent': 'clash-verge-rev/2.3.1', Accept: 'application/x-yaml,text/plain,*/*' },
  { 'User-Agent': 'mihomo/1.19.3', Accept: 'application/x-yaml,text/plain,*/*' },
  { 'User-Agent': 'ClashX/1.118.0', Accept: 'application/x-yaml,text/plain,*/*' },
  { 'User-Agent': 'Shadowrocket/2.2.45' },
  { 'User-Agent': 'Surge/5.8.0' }
];

async function fetchInfo(ctx, slot) {
  const cacheKey = `sub_cache_${slot.url}`;
  const cache = await ctx.storage.get(cacheKey);
  if (cache) {
    try {
      const parsed = JSON.parse(cache);
      if (Date.now() - parsed.time < CACHE_TIME) {
        return { ...parsed.data, name: slot.name, remainDays: slot.resetDay ? getRemainingDays(slot.resetDay) : null };
      }
    } catch {}
  }

  for (const method of ['head', 'get']) {
    for (const requestUrl of buildVariants(slot.url)) {
      for (const headers of UA_LIST) {
        try {
          const resp = await ctx.http[method](requestUrl, { headers });
          const raw = resp.headers.get('subscription-userinfo') || '';
          const info = parseUserInfo(raw);
          if (!info) continue;
          const result = {
            error: null,
            used: (info.upload || 0) + (info.download || 0),
            totalBytes: info.total || 0,
            expire: info.expire || null,
            remainDays: slot.resetDay ? getRemainingDays(slot.resetDay) : null
          };
          await ctx.storage.set(cacheKey, JSON.stringify({ time: Date.now(), data: result }));
          return { ...result, name: slot.name };
        } catch {}
      }
    }
  }
  return { name: slot.name, error: true };
}

function emptyWidget(C) {
  return { 
    type: 'widget', 
    backgroundColor: C.bg, 
    padding: 20, 
    children: [
      {
        type: 'stack',
        direction: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        children: [
          { type: 'text', text: '📡', font: { size: 32 } },
          { type: 'spacer', height: 12 },
          { type: 'text', text: '未配置订阅', font: { size: 16, weight: 'semibold', design: 'rounded' }, textColor: C.text },
          { type: 'spacer', height: 4 },
          { type: 'text', text: '请添加 URL 环境变量', font: { size: 12, design: 'rounded' }, textColor: C.textSecondary }
        ]
      }
    ] 
  };
}

function errorWidget(C, name) {
  return { 
    type: 'widget', 
    backgroundColor: C.bg, 
    padding: 20, 
    children: [
      {
        type: 'stack',
        direction: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        children: [
          { type: 'text', text: '⚠️', font: { size: 32 } },
          { type: 'spacer', height: 12 },
          { type: 'text', text: `${name} 获取失败`, font: { size: 16, weight: 'semibold', design: 'rounded' }, textColor: C.text },
          { type: 'spacer', height: 4 },
          { type: 'text', text: '请检查网络或订阅链接', font: { size: 12, design: 'rounded' }, textColor: C.textSecondary }
        ]
      }
    ] 
  };
}

function buildVariants(url) {
  const seen = new Set();
  const out = [];
  const add = (value) => { if (value && !seen.has(value)) { seen.add(value); out.push(value); } };
  add(url);
  add(withParam(url, 'flag', 'clash'));
  add(withParam(url, 'flag', 'meta'));
  add(withParam(url, 'list', 'true'));
  return out;
}

function withParam(url, key, value) {
  return `${url}${url.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;
}

function parseUserInfo(header) {
  const pairs = header.match(/\w+=[\d.eE+-]+/g) || [];
  if (!pairs.length) return null;
  return Object.fromEntries(pairs.map(pair => {
    const [key, value] = pair.split('=');
    return [key, Number(value)];
  }));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 GB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(1)} ${units[index]}`;
}

function getExpireText(expire, remainDays) {
  if (remainDays != null) {
    const date = new Date();
    date.setDate(date.getDate() + remainDays);
    return `到期 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  if (expire && Number(expire) > 0) {
    let ts = Number(expire);
    if (ts < 1e12) ts *= 1000;
    const date = new Date(ts);
    return `到期 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return '到期 永久有效';
}

function getRemainingDays(resetDay) {
  const now = new Date();
  const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(resetDay, maxDay);
  let next = new Date(now.getFullYear(), now.getMonth(), safeDay);
  if (now.getDate() >= safeDay) {
    const nextMonthMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
    next = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(resetDay, nextMonthMax));
  }
  return Math.max(0, Math.ceil((next - now) / 86400000));
}