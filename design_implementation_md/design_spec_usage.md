昭和复古粗野主义 - 设计规范使用说明
本文档旨在帮助团队成员理解并正确使用为本项目定制的 Tailwind CSS 配置。

1. 安装与配置
   将 tailwind.config.js 文件放置在项目根目录。
   确保项目中已安装 Tailwind CSS。
   在您的主 CSS 文件中引入 Tailwind 的基础、组件和工具样式：
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

2. 核心配色方案
   我们定义了一套具有昭和复古风格的配色方案。在代码中，请使用以下类名来调用它们：
   背景色: bg-retro-bg (米白), bg-retro-yellow (芥末黄), bg-retro-red (砖红)
   文字颜色: text-retro-black (深棕), text-retro-red (砖红), text-white
   边框颜色: border-retro-black (深棕)
   示例: <div class="bg-retro-red text-white">...</div>
3. 字体
   全局字体已设为 Public Sans。您可以通过 font-bold (默认) 和 font-black (更粗) 来控制字重。
4. 核心组件类
   为了统一风格，我们创建了几个核心的组件类。请优先使用这些类来构建 UI 元素。
   .brutalist-element:
   这是最基础的样式，包含了 4px 深棕色粗边框、20px 大圆角 和 6px 硬阴影。大多数 UI 容器都应基于此构建。
   .brutalist-card:
   一个带有白色背景的基础卡片。用法：<div class="brutalist-card p-4">...</div>
   .brutalist-button:
   一个标准的 芥末黄 按钮，包含了所有悬停和点击效果。用法：<button class="brutalist-button">点击我</button>
   .brutalist-button-primary:
   用于主要操作的 砖红色 按钮。需要与 .brutalist-button 配合使用。用法：<button class="brutalist-button brutalist-button-primary">主要操作</button>
   .brutalist-input:
   一个标准的输入框。用法：<input type="text" class="brutalist-input" />
