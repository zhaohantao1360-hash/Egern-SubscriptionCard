/******************************
脚本名称: SubscriptionCard
Version : v6.1.0
更新时间: 2026-06-27
平台: Egern
功能: 机场流量用量查询
脚本作者：Nullwhy
UI 设计：QClaw

v6.1.0 小号组件重新设计：
- Apple iOS 26 设计语言
- 顶部：Logo + 名称 + 状态
- 中间：超大号剩余流量
- 渐变进度条
- 底部：天数 + 时间
**********************************/

export default async function (ctx) {
  const url = (ctx.env.URL || ctx.env.URL1 || '').trim();
  const name = (ctx.env.NAME || ctx.env.NAME1 || '').trim() || 'SUBSCRIPTION';
  const rawReset = (ctx.env.RESET || ctx.env.RESET1 || '').trim();
  const resetDay = /^\d+$/.test(rawReset) ? Number(rawReset) : null;

  // Apple iOS 26 配色系统
  const C = {
    bg: { light: '#F2F2F7', dark: '#000000' },
    card: { light: '#FFFFFF', dark: '#1C1C1E' },
    text: { light: '#000000', dark: '#FFFFFF' },
    textSecondary: { light: '#3C3C43', dark: '#EBEBF5' },
    textTertiary: { light: '#6C6C70', dark: '#636366' },
    
    // Apple 系统色
    blue: { light: '#007AFF', dark: '#0A84FF' },
    green: { light: '#34C759', dark: '#30D158' },
    orange: { light: '#FF9500', dark: '#FF9F0A' },
    red: { light: '#FF3B30', dark: '#FF453A' },
    gray2: { light: '#D1D1D6', dark: '#48484A' },
    gray6: { light: '#636366', dark: '#AEAEB2' },
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

  let statusColor = C.green;
  if (remainPercent <= 5) statusColor = C.red;
  else if (remainPercent <= 20) statusColor = C.orange;
  else if (remainPercent <= 40) statusColor = C.orange;

  const expireText = getExpireText(info.expire, info.remainDays);
  const daysText = info.remainDays != null ? info.remainDays : null;
  const now = new Date();
  const refreshText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (ctx.widgetFamily === 'systemSmall') {
    return buildSmallWidget(C, { name, percent, remainPercent, statusColor, remain, daysText, refreshText });
  }

  return buildMediumWidget(C, { name, percent, remainPercent, statusColor, remain, total, used, expireText, daysText, refreshText });
}

// ==================== 小号组件 ====================
function buildSmallWidget(C, data) {
  const { name, percent, remainPercent, statusColor, remain, daysText, refreshText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [14, 14],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 10,
        children: [
          // 顶部：Logo + 名称 + 状态
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              // Logo
              { type: 'stack', width: 24, height: 24, borderRadius: 6, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', children: [
                { type: 'text', text: '✈', font: { size: 12 } }
              ]},
              { type: 'spacer', width: 8 },
              // 名称
              { type: 'text', text: name, font: { size: 13, weight: 'semibold', design: 'rounded' }, textColor: C.text, maxLines: 1 },
              { type: 'spacer' },
              // 状态 Badge
              {
                type: 'stack',
                padding: [3, 8],
                backgroundColor: statusColor,
                borderRadius: 10,
                children: [
                  { type: 'text', text: statusTextZh(percent), font: { size: 10, weight: 'semibold', design: 'rounded' }, textColor: '#FFFFFF', maxLines: 1 }
                ]
              }
            ]
          },
          
          // 中间：超大号剩余流量
          {
            type: 'stack',
            direction: 'column',
            alignItems: 'center',
            children: [
              { type: 'text', text: formatBytesLarge(remain), font: { size: 42, weight: 'bold', design: 'rounded' }, textColor: C.text, maxLines: 1 },
              { type: 'text', text: '剩余流量', font: { size: 11, design: 'rounded' }, textColor: C.textTertiary, maxLines: 1 }
            ]
          },
          
          // 渐变进度条
          {
            type: 'stack',
            width: '100%',
            height: 8,
            borderRadius: 4,
            backgroundColor: C.gray2,
            children: [
              {
                type: 'stack',
                width: `${percent}%`,
                height: 8,
                borderRadius: 4,
                backgroundColor: statusColor,
                children: []
              }
            ]
          },
          
          // 底部：天数 + 时间
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              { type: 'text', text: `${Math.round(remainPercent)}%`, font: { size: 12, weight: 'medium', design: 'rounded' }, textColor: statusColor, maxLines: 1 },
              { type: 'spacer' },
              { type: 'text', text: daysText != null ? `${daysText} 天` : '永久', font: { size: 11, design: 'rounded' }, textColor: C.textTertiary, maxLines: 1 },
              { type: 'spacer', width: 8 },
              { type: 'text', text: refreshText, font: { size: 10, design: 'rounded' }, textColor: C.textTertiary, maxLines: 1 }
            ]
          }
        ]
      }
    ]
  };
}

// ==================== 中号组件 ====================
function buildMediumWidget(C, data) {
  const { name, percent, remainPercent, statusColor, remain, total, used, expireText, daysText, refreshText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [20, 20],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 16,
        children: [
          // 顶部
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              { type: 'text', text: name, font: { size: 15, weight: 'semibold', design: 'rounded' }, textColor: C.text, maxLines: 1 },
              { type: 'spacer' },
              {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                gap: 4,
                children: [
                  { type: 'stack', width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor, children: [] },
                  { type: 'text', text: statusTextZh(percent), font: { size: 13, weight: 'medium', design: 'rounded' }, textColor: statusColor, maxLines: 1 }
                ]
              }
            ]
          },
          
          // 中部
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              {
                type: 'stack',
                direction: 'column',
                gap: 4,
                flex: 1,
                children: [
                  { type: 'text', text: formatBytesLarge(remain), font: { size: 36, weight: 'bold', design: 'rounded' }, textColor: C.text, maxLines: 1 },
                  { type: 'text', text: '剩余流量', font: { size: 13, design: 'rounded' }, textColor: C.textSecondary, maxLines: 1 }
                ]
              },
              buildRing(C, percent, statusColor, 80, 8)
            ]
          },
          
          // 数据网格
          {
            type: 'stack',
            direction: 'row',
            gap: 12,
            children: [
              buildInfoItem(C, '套餐', formatBytes(total)),
              buildInfoItem(C, '已用', formatBytes(used)),
              buildInfoItem(C, '到期', formatExpireValue(expireText)),
              buildInfoItem(C, '天数', daysText != null ? `${daysText}` : '永久'),
            ]
          },
          
          // 时间戳
          { type: 'text', text: `更新于 ${refreshText}`, font: { size: 11, design: 'rounded' }, textColor: C.textTertiary, maxLines: 1 }
        ]
      }
    ]
  };
}

// ==================== 大号多机场组件 ====================
function buildLargeMultiWidget(C, infos) {
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [16, 20],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 12,
        children: [
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              { type: 'text', text: '订阅', font: { size: 15, weight: 'semibold', design: 'rounded' }, textColor: C.text, maxLines: 1 },
              { type: 'spacer' },
              { type: 'text', text: `${infos.length} 个`, font: { size: 13, design: 'rounded' }, textColor: C.textSecondary, maxLines: 1 }
            ]
          },
          ...infos.slice(0, 3).map(info => buildLargeAirportCard(C, info))
        ]
      }
    ]
  };
}

function buildLargeAirportCard(C, info) {
  if (info.error) {
    return {
      type: 'stack',
      padding: [14, 16],
      backgroundColor: C.card,
      borderRadius: 16,
      children: [{ type: 'text', text: `${info.name} · 获取失败`, font: { size: 14, weight: 'medium', design: 'rounded' }, textColor: C.red, maxLines: 1 }]
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
    padding: [14, 16],
    backgroundColor: C.card,
    borderRadius: 16,
    children: [
      buildRing(C, percent, statusColor, 52, 5),
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
            children: [
              { type: 'text', text: info.name, font: { size: 14, weight: 'semibold', design: 'rounded' }, textColor: C.text, maxLines: 1 },
              { type: 'spacer' },
              { type: 'text', text: `${Math.round(remainPercent)}%`, font: { size: 14, weight: 'bold', design: 'rounded' }, textColor: statusColor, maxLines: 1 }
            ]
          },
          { type: 'text', text: formatBytesLarge(remain), font: { size: 18, weight: 'bold', design: 'rounded' }, textColor: C.text, maxLines: 1 },
          { type: 'text', text: `到期 ${formatExpireValue(expireText)}${daysText != null ? ' · ' + daysText + '天' : ''}`, font: { size: 11, design: 'rounded' }, textColor: C.textSecondary, maxLines: 1 }
        ]
      }
    ]
  };
}

// ==================== 辅助函数 ====================

function buildRing(C, percent, statusColor, size, strokeWidth) {
  return {
    type: 'stack',
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
    children: [
      { type: 'stack', width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: C.gray2, children: [] },
      {
        type: 'stack',
        direction: 'column',
        alignItems: 'center',
        children: [
          { type: 'text', text: `${100 - Math.round(percent)}`, font: { size: size * 0.28, weight: 'bold', design: 'rounded' }, textColor: statusColor, maxLines: 1 },
          { type: 'text', text: '%', font: { size: size * 0.14, design: 'rounded' }, textColor: C.textSecondary, maxLines: 1 }
        ]
      }
    ]
  };
}

function buildInfoItem(C, label, value) {
  return {
    type: 'stack',
    direction: 'column',
    gap: 2,
    alignItems: 'center',
    flex: 1,
    children: [
      { type: 'text', text: label, font: { size: 11, design: 'rounded' }, textColor: C.textTertiary, maxLines: 1 },
      { type: 'text', text: value, font: { size: 13, weight: 'medium', design: 'rounded' }, textColor: C.text, maxLines: 1 }
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
      name: (env[`NAME${index}`] || '').trim() || `订阅 ${index}`,
      resetDay: /^\d+$/.test(rawReset) ? Number(rawReset) : null
    });
  }
  return slots;
}

const CACHE_TIME = 30 * 60 * 1000;
const UA_LIST = [
  { 'User-Agent': 'Quantumult%20X/1.5.2' },
  { 'User-Agent': 'clash-verge-rev/2.3.1', Accept: 'application/x-yaml,text/plain,*/*' },
  { 'User-Agent': 'mihomo/1.19.3', Accept: 'application/x-yaml,text/plain,*/*' }
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

function statusTextZh(percent) {
  if (percent >= 95) return '告急';
  if (percent >= 80) return '偏低';
  return '充足';
}

function formatExpireValue(text) {
  return String(text || '').replace(/^到期\s*/, '');
}

function buildUsageGrid(C, percent, cellSize = 14, cellGap = 5) {
  const total = 35;
  const active = Math.max(0, Math.min(total, Math.round((percent / 100) * total)));
  const rows = [];
  for (let row = 0; row < 5; row++) {
    const cells = [];
    for (let col = 0; col < 7; col++) {
      const index = row * 7 + col;
      cells.push({
        type: 'stack',
        width: cellSize,
        height: cellSize,
        borderRadius: Math.max(3, Math.round(cellSize / 3)),
        backgroundColor: index < active ? C.green : C.gray2,
        children: []
      });
    }
    rows.push({ type: 'stack', direction: 'row', gap: cellGap, children: cells });
  }
  return { type: 'stack', direction: 'column', gap: 3, children: rows };
}

function emptyWidget(C) {
  return { type: 'widget', backgroundColor: C.bg, padding: 24, children: [{ type: 'text', text: '未配置订阅', font: { size: 16, weight: 'semibold', design: 'rounded' }, textColor: C.text }] };
}

function errorWidget(C, name) {
  return { type: 'widget', backgroundColor: C.bg, padding: 24, children: [{ type: 'text', text: `${name} · 获取失败`, font: { size: 16, weight: 'semibold', design: 'rounded' }, textColor: C.red }] };
}

function buildVariants(url) {
  const seen = new Set();
  const out = [];
  const add = (value) => { if (value && !seen.has(value)) { seen.add(value); out.push(value); } };
  add(url);
  add(withParam(url, 'flag', 'clash'));
  add(withParam(url, 'flag', 'meta'));
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

// 格式化流量（小号）
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 GB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(1)} ${units[index]}`;
}

// 格式化流量（大号）
function formatBytesLarge(bytes) {
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