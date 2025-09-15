开发一个chrome插件，实现以下功能：
1. 只对 http://192.168.1.88:8088/findig-web/#/logTracing/jobLog 生效
2. 页面加载后有一个table，talbe中有一列叫扩展,扩展中有符合条件，会有一个详情按钮，点击这个按钮会发一个post请求,path是/logExtData，我们来试试点击这个详情按钮或在浏览器console把请求的响应获取并输出在console中。下面的html是table的示例html内容