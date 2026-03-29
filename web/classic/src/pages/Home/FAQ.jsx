import React, { useState } from "react";
import { Typography } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

const BASE_URL = window.location.origin;

const faqData = [
  {
    q: "可以用来做什么？",
    a: `<strong>🎭 娱乐创作</strong>：角色扮演、小说写作、剧本创作、创意文案<br/><br/>
<strong>💻 编程开发</strong>：AI 编程助手、代码审查、Bug 修复、算法设计、自动化脚本、API 对接<br/><br/>
<strong>📚 学习研究</strong>：科研论文分析与撰写、实验数据处理、文献综述、学术翻译、数学物理化学问题解答、考研/考公备考<br/><br/>
<strong>📊 数据处理</strong>：数据分析、Excel/SQL 公式生成、报表自动化、数据清洗转换、BI 报告生成、爬虫脚本<br/><br/>
<strong>🎨 图像生成</strong>：AI 绘图（gemini-3.1-flash-image）、设计灵感、Logo 设计、插画创作<br/><br/>
<strong>💼 办公效率</strong>：会议纪要、邮件撰写、PPT 大纲、演讲稿、合同审阅、法律咨询<br/><br/>
<strong>🌐 更多场景</strong>：客服机器人、智能问答、知识库、内容审核、情感分析、舆情监控...`
  },
  {
    q: "Claude Code 怎么用 Opus 1M 超长上下文？",
    a: `有两种方式：<br/><br/><strong>方式一：settings.json 配置（推荐）</strong><br/>编辑 <code>~/.claude/settings.json</code>，设置 <code>"model": "opus[1m]"</code>，详见下方 Claude Code 教程。<br/><br/><strong>方式二：CLI 中手动切换</strong><br/>在 Claude Code 运行时，输入 <code>/model</code> 命令，然后选择或手动输入 <code>opus[1m]</code> 即可切换到 1M 上下文。<br/><br/>💡 <code>opus[1m]</code> 表示使用 Claude Opus 模型并开启 1M token 超长上下文窗口，适合处理大型代码库和长对话。`
  },
  {
    q: "Claude Code 报 Unable to connect to Anthropic services / 401 Invalid token 怎么办？",
    a: `如果你是 <strong>Windows 原生环境</strong>，很多时候不是 Key 错，而是本地 <code>.claude.json</code> 没有正确刷新。<br/><br/><strong>建议按下面顺序处理：</strong><br/>1. 备份并删除 <code>C:\Users\你的用户名\.claude.json</code><br/>2. 重新打开 Claude Code，在弹出的 <code>yes/no(recommended)</code> 里选择 <code>yes</code><br/>3. 如果还不行，再检查 <code>.claude.json</code> 里是否包含 <code>"hasCompletedOnboarding": true</code><br/><br/>如果仍报错，再回头检查 <code>ANTHROPIC_BASE_URL</code> 是否误加了 <code>/v1</code>。`
  },
  {
    q: "怎么查询用量和剩余额度？",
    a: `登录后台，在「令牌」页面可以查看每个 Key 的已用量和剩余额度。`
  },
  {
    q: "为什么连不上 / 测试报错？",
    a: `请检查：<br/>1. 网址是否复制了多余的空格？<br/>2. Key 是否复制完整？<br/>3. 接口地址可能需要或不需要 <code>/v1</code> 后缀，建议尝试添加或去除。`
  },
  {
    q: "接口地址要加 /v1 吗？",
    a: `<strong>大部分工具需要加 /v1</strong>：<br/>SillyTavern、ChatBox、OpenCat、Cline、Cursor、OpenCode 等工具的接口地址填：<br/><code>${BASE_URL}/v1</code><br/><br/><strong>⚠️ Claude Code 不加 /v1</strong>：<br/>Claude Code 的 <code>ANTHROPIC_BASE_URL</code> 填的是不带 /v1 的地址：<br/><code>${BASE_URL}</code><br/>如果配错会报连接错误，请仔细检查。`
  },
  {
    q: 报错 Model not found 怎么办？,
    a: `请确保模型名称完全正确，一个字符都不能错。<br/><br/>你可以用以下命令查看你的 Key 可用的所有模型：<br/><code>curl -s ${BASE_URL}/v1/models -H "Authorization: Bearer sk-你的Key"</code>`
  },
  {
    q: "Thinking 模型是什么？",
    a: "Thinking 版本（如 gemini-2.5-flash-thinking、claude-opus-4-6-thinking）会在回答前进行深度思考，推理能力更强，适合处理数学、代码和复杂逻辑问题。响应时间可能稍长，但质量显著提升。"
  },
  {
    q: "Gemini 3.1 Pro High/Low 区别？",
    a: "<strong>High (满血版)</strong>：拥有极致的推理性能，适合处理超复杂的逻辑任务，更聪明。<br/><strong>Low (极速版)</strong>：进行了速度与性能的平衡优化，响应更快，性价比更高，足以应对绝大多数场景。"
  },
  {
    q: "图片模型怎么选尺寸？",
    a: `<code>gemini-3.1-flash-image</code> 支持多种尺寸变体，在模型名后加后缀即可：<br/><br/><strong>比例变体：</strong><br/>• <code>gemini-3.1-flash-image</code> — 默认比例<br/>• <code>gemini-3.1-flash-image-16x9</code> — 横屏宽幅<br/>• <code>gemini-3.1-flash-image-9x16</code> — 竖屏长图<br/>• <code>gemini-3.1-flash-image-1x1</code> — 正方形<br/>• <code>gemini-3.1-flash-image-4x3</code> / <code>3x4</code> — 经典比例<br/>• <code>gemini-3.1-flash-image-21x9</code> — 超宽幅`
  },
  {
    q: "密钥会过期吗？",
    a: "<strong>次数套餐</strong>：永不过期。<br/><strong>时间套餐</strong>（日卡/周卡）：到期后失效。"
  },
  {
    q: "时间套餐的速率限制是怎么计算的？",
    a: `时间套餐采用<strong>滑动窗口</strong>机制计算速率限制，而不是固定时间段重置。<br/><br/><strong>举例说明：</strong><br/>假设套餐限制为「3 小时内最多 80 次请求」：<br/>• 你在 14:00 开始使用，到 14:30 已经用了 80 次<br/>• 此时会提示速率超限，需要等待<br/>• 但不需要等到 17:00（3 小时后）才能继续<br/>• 系统会持续滑动统计最近 3 小时内的请求数，只要最近 3 小时内累计不超过 80 次就可以继续<br/><br/>💡 简单理解：不是「每 3 小时重置一次」，而是「任意连续 3 小时内不超过上限」。合理分散使用，几乎不会触发限制。`
  },
  {
    q: "Claude Code 跑一个任务，为什么次数消耗了很多次？",
    a: `这是<strong>完全正常的行为</strong>。Claude Code 是一个 <strong>Agent（自主智能体）</strong>，不是普通的一问一答聊天机器人。<strong>1 个任务 ≠ 1 次 API 调用</strong>，这是所有 Agent 类产品的基本工作方式。<br/><br/><strong>🔄 工作原理：</strong><br/>当你给 Claude Code 一个任务（比如「修复这个 Bug」），它会<strong>自主决策</strong>并循环执行多个步骤，每个步骤都是一次独立的 API 调用：<br/><br/>1. 📖 读取代码文件 → 1 次调用<br/>2. 🔍 搜索相关代码 → 1 次调用<br/>3. 🧠 分析并决定方案 → 1 次调用<br/>4. ✏️ 编写代码 → 1 次调用<br/>5. 🧪 运行测试验证 → 1 次调用<br/>... 循环直到任务完成<br/><br/><strong>💡 省次数的小技巧：</strong><br/>• 给出<strong>清晰、具体</strong>的指令，减少试错<br/>• 用 <code>/compact</code> 命令压缩上下文<br/>• 复杂任务拆成多个小任务<br/>• 用 <code>CLAUDE.md</code> 文件预设项目规范`
  },
  {
    q: "支持退款吗？",
    a: "虚拟商品（API Key）一经发出，不支持退款。但如果遇到连接问题，我们会全力协助您解决！"
  }
];

const FAQItem = ({ question, answer, isOpen, onClick }) => (
  <div
    style={{
      border: "1px solid var(--semi-color-border)",
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 12,
    }}
  >
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "16px 20px",
        textAlign: "left",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "var(--semi-color-text-0)",
        fontSize: 15,
        fontWeight: 500,
      }}
    >
      <span>{question}</span>
      <span
        style={{
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s",
          flexShrink: 0,
          fontSize: 12,
        }}
      >
        ▼
      </span>
    </button>
    {isOpen && (
      <div
        style={{
          padding: "0 20px 16px",
          fontSize: 14,
          lineHeight: 1.8,
          color: "var(--semi-color-text-1)",
          borderTop: "1px solid var(--semi-color-border)",
        }}
      >
        <div
          style={{ paddingTop: 12 }}
          dangerouslySetInnerHTML={{ __html: answer }}
        />
      </div>
    )}
  </div>
);

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "48px 16px",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 8,
          color: "var(--semi-color-text-0)",
        }}
      >
        ❓ 常见问题
      </h2>
      <p
        style={{
          textAlign: "center",
          marginBottom: 32,
          color: "var(--semi-color-text-2)",
          fontSize: 15,
        }}
      >
        遇到问题？先看这里
      </p>
      {faqData.map((item, idx) => (
        <FAQItem
          key={idx}
          question={item.q}
          answer={item.a}
          isOpen={openIndex === idx}
          onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
        />
      ))}
    </div>
  );
};

export default FAQ;
