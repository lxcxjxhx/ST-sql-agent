# MVU-SQLite Memory 使用指南

## 欢迎使用 MVU-SQLite Memory

这是一个强大的 SillyTavern 扩展，提供热/冷状态管理、AI 变量提取和 FTS5 全文记忆功能。

## 快速开始

### 1. 添加变量
- 点击 "+ Add Variable" 按钮
- 输入变量名称和值
- 点击 "Save" 保存

### 2. 应用模板
- 切换到 "Templates" 标签
- 选择模板类别（Character Lore, User Preferences 等）
- 点击 "Apply" 应用模板

### 3. 搜索记忆
- 使用命令: `/memory search term`
- 或使用 function tool: `search_memory`

### 4. 创建快照
- 快照可以保存当前所有变量的状态
- 需要时可以回滚到之前的状态

## AI 命令

```
/sql SELECT * FROM variable_state
/tables
/memory I prefer blue watches
```

## Function Tools

| Tool | Description |
|------|-------------|
| `set_variable` | 设置 MVU 状态变量 |
| `get_variable` | 获取单个变量 |
| `get_all_variables` | 获取所有变量 |
| `delete_variable` | 删除变量 |
| `search_memory` | 搜索 FTS5 记忆 |
| `store_memory` | 存储记忆 |
| `extract_variables` | 从文本提取变量 |
| `create_snapshot` | 创建状态快照 |
| `rollback_snapshot` | 回滚到快照 |

## 变量命名建议

- 使用下划线分隔: `user_preference_color`
- 使用角色前缀: `char_elf_name`
- 使用中文: `用户喜欢颜色`

## 角色集成

变量自动绑定到当前角色。切换角色时，变量集会自动切换。

## AI 变量提取

当用户在聊天中表达偏好时，AI 会自动提取：

- "I prefer X" → `preference_X`
- "I like Y" → `likes_Y`
- "I hate Z" → `dislikes_Z`
- "I am A" → `is_A`

## 数据存储

- 热状态: MVU StateStore (内存)
- 冷存储: SQLite (持久化)
- 全文检索: FTS5 (记忆搜索)

所有数据默认存储在浏览器 localStorage 中。

## 提示词模板集成

在提示词中使用变量：

```
角色名: {{character_name}}
用户偏好: {{user_preference_color}}
当前话题: {{session_topic}}
```

## 故障排除

### 变量不保存
- 检查 localStorage 是否可用
- 确认 sync 已启用

### 模板不应用
- 确认模板 JSON 格式正确
- 检查浏览器控制台错误

### 搜索不工作
- FTS5 需要 SQLite 支持
- 备选方案使用 localStorage 搜索

## 角色脚本集成

MVU-SQLite 支持通过角色脚本注册 Schema 和正则模式，实现类似 NEED.MD 的复杂数据结构管理。

### Schema 注册

在角色脚本中注册 Zod Schema：

```javascript
import { registerMvuSchema } from 'mvu-schema';

const Schema = z.object({
  运营环境: z.object({
    当前日期: z.string().prefault('第1天'),
    威胁等级: z.coerce.number().prefault(2),
    SOC状态: z.enum(['正常', '忙碌', '紧急']).prefault('正常'),
  }).prefault({}),
});

$(() => {
  registerMvuSchema('soc_dashboard', Schema);
});
```

### 正则模式配置

添加自定义正则提取模式：

```javascript
MVU_REGEX.addPattern(
  '自定义模式',
  /(\d+)岁/,
  (match) => ({ key: 'age', value: parseInt(match[1]) })
);
```

内置模式自动提取：
- 中文名字: `名字是张三` → `user_name = 张三`
- 中文偏好: `我喜欢苹果` → `preference_1 = 苹果`
- 英文偏好: `I prefer blue` → `preference_blue = blue`

### UI 组件使用

注入 SOC 风格面板：

```javascript
MVU_UI.injectPanel('soc-panel', `
  <div class="mvu-panel">
    <div class="mvu-panel-header">
      <span class="mvu-panel-title">态势感知</span>
    </div>
    <div class="mvu-card">
      <div class="mvu-card-label">威胁等级</div>
      <div class="mvu-card-value" id="threat-level">0</div>
    </div>
  </div>
`);

MVU_UI.bindPanelEvents('soc-panel', {
  '.mvu-card': () => openThreatModal()
});
```

### 弹窗使用

```javascript
function fillThreatModal(bodyEl) {
  const level = MVU_STATE.get('威胁等级');
  bodyEl.innerHTML = `
    <div class="mvu-modal-stat-row">
      <span class="mvu-modal-stat-label">当前等级</span>
      <span class="mvu-modal-stat-value">${level}</span>
    </div>
  `;
}

MVU_UI.openModal('modal-threat', fillThreatModal);
```

### Prompt 模板变量

在 Character Card 或 User Prompt 中使用 `{{变量名}}` 引用变量：

```
当前状态：{{current_status}}
用户偏好：{{user_preference}}
威胁等级：{{threat_level}}
```

### 完整示例 (NEED.MD 风格)

参考 `templates/soc_dashboard.json` 获取完整的 SOC 仪表盘配置示例。