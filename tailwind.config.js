module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
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
  plugins: [],
};
