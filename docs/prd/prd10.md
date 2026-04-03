任务： 修复令牌管理->设备令牌管理 页面，点击生成auth-token，可以登录Octelium集群，但是无法读取服务。没有权限。操作Octelium集群重新错误信息：“gRPC error PermissionDenied: Octelium: Unauthorized”
要求：
1：修复这bug，可以在创建请求中直接指定策略
创建用户接口：在调用 CreateUser 接口时，在 policies 数组参数中包含 ["allow-all"]。
系统配置文件：后台端配置文件或者环境变量可以配置化权限列表 检查 default_user_permissions 字段，确保其值为 all 或指向全允许策略的 ID。
2：我开发调试分布，先可以使用allow-all的默认配置

项目背景： 

相关材料： 
登录Octelium的方法     
octelium logout && \          
export OCTELIUM_DOMAIN=teniuapi.cloud && export OCTELIUM_INSECURE_TLS=true && \
octelium login --domain teniuapi.cloud --auth-token AQpABfm0_8f_2oRB2CU3-DuGzUW-8KMY_ObpOqoVA0DAkM0pFxoL8I9PGah8RxFoDubwXvPlUYjATCFVM-uVmFFxAxJACAMSEOeSH6OT10ZYlgI84BaexqsaEABsB0iPz0L2kMiNsBnsTTciENRjGXFl50M1v7L-owaFWQsqBgic4cLPBg

创建用户命令配置参考如下：
kind: User
metadata:
  name: user1
spec:
  type: HUMAN
  authorization:
    policies: ["allow-all"]


-- dev01
AQpAaNskwqteIKNeM6awQb3acj8g1TzIdBnTpfOCAtXqZQXiqrgte8YqsdRgfbKoeKpkaZroiBGVKZjSsw50LurCAxI4CAMSEOeSH6OT10ZYlgI84BaexqsaED26EHaAVEyPrflq2YYFMlsiENijoXkhc0e6s5ZWUCCCN9E

 
octelium logout && \          
export OCTELIUM_DOMAIN=teniuapi.cloud && export OCTELIUM_INSECURE_TLS=true && \
octelium login --domain teniuapi.cloud --auth-token \
AQpAaNskwqteIKNeM6awQb3acj8g1TzIdBnTpfOCAtXqZQXiqrgte8YqsdRgfbKoeKpkaZroiBGVKZjSsw50LurCAxI4CAMSEOeSH6OT10ZYlgI84BaexqsaED26EHaAVEyPrflq2YYFMlsiENijoXkhc0e6s5ZWUCCCN9E

AQpABfm0_8f_2oRB2CU3-DuGzUW-8KMY_ObpOqoVA0DAkM0pFxoL8I9PGah8RxFoDubwXvPlUYjATCFVM-uVmFFxAxJACAMSEOeSH6OT10ZYlgI84BaexqsaEABsB0iPz0L2kMiNsBnsTTciENRjGXFl50M1v7L-owaFWQsqBgic4cLPBg



