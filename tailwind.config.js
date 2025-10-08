const plugin = require("tailwindcss/plugin");

module.exports = {
  content: [
    "./*.{html,js}", // 扫描项目中的HTML和JS文件以移除未使用的样式
  ],
  theme: {
    extend: {
      // 1. 核心配色方案
      colors: {
        "retro-yellow": "#D4A017", // 芥末黄
        "retro-red": "#B3312C", // 砖红
        "retro-green": "#808000", // 橄榄绿
        "retro-blue": "#A0C4E8", // 浅灰蓝
        "retro-bg": "#F5F5DC", // 米白背景
        "retro-black": "#3D2B1F", // 复古深棕 (代替纯黑)
      },
      // 2. 字体配置
      fontFamily: {
        sans: ['"Public Sans"', "sans-serif"], // 无衬线字体
      },
      // 3. 边框圆角配置
      borderRadius: {
        brutalist: "20px", // 夸张的圆角
      },
      // 4. 阴影配置
      boxShadow: {
        brutalist: "6px 6px 0px 0px #3D2B1F", // 厚重阴影 (硬编码颜色)
        "brutalist-hover": "3px 3px 0px 0px #3D2B1F", // 悬停阴影
      },
    },
  },
  plugins: [
    // 5. CSS组件方案插件
    plugin(function ({ addComponents, theme }) {
      addComponents({
        // 核心粗野主义元素
        ".brutalist-element": {
          borderWidth: "4px",
          borderColor: theme("colors.retro-black"),
          borderRadius: theme("borderRadius.brutalist"),
          boxShadow: theme("boxShadow.brutalist"),
          transition: "all 0.1s ease-in-out",
        },
        // 卡片
        ".brutalist-card": {
          backgroundColor: theme("colors.white"),
          "@apply brutalist-element": {},
        },
        // 按钮
        ".brutalist-button": {
          backgroundColor: theme("colors.retro-yellow"),
          color: theme("colors.white"),
          fontWeight: "900",
          padding: "0.75rem 1.5rem",
          textAlign: "center",
          cursor: "pointer",
          "@apply brutalist-element": {},

          "&:hover": {
            transform: "translate(3px, 3px)",
            boxShadow: theme("boxShadow.brutalist-hover"),
          },
          "&:active": {
            transform: "translate(6px, 6px)",
            boxShadow: "none",
          },
        },
        // 主按钮 (砖红色)
        ".brutalist-button-primary": {
          backgroundColor: theme("colors.retro-red"),
          color: theme("colors.white"),
        },
        // 输入框
        ".brutalist-input": {
          backgroundColor: theme("colors.white"),
          fontWeight: "700",
          padding: "0.5rem 1rem 0.5rem 2.5rem",
          "@apply brutalist-element": {},
          "&:focus": {
            outline: `4px solid ${theme("colors.retro-yellow")}`,
            outlineOffset: "2px",
          },
        },
      });
    }),
  ],
};
