
      // 先落主题再画首屏，避免深色偏好用户看到一闪的浅色底
      (function () {
        try {
          var saved = localStorage.getItem("yunara-site-theme");
          var theme =
            saved ||
            (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
          document.documentElement.setAttribute("data-theme", theme);
        } catch (e) {
          /* 读不到就用 HTML 上的 light 默认值 */
        }
      })();
    