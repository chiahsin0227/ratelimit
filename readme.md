# Redis

```
docker run --name redis_lab -p 6379:6379 -d redis
```

# 限制每小時來自同一個 IP 的請求數量不得超過 1000
對於題目的`限制每小時來自同一個 IP 的請求數量不得超過 1000`似乎有兩種解釋方式:

|時間|事件|
|---|----|
|15:10|第一次送出一個request|
|15:30|送出950個request|
|16:20|送出500個request|

* 第一種: 限制每小時的time window是固定不動的，如15:00~16:00是一個time window，16:00~17:00是下一個time window。以上面的例子來說，在15:10送出第一個request，所以time window從15:10開始，到16:10結束，一共送出了951個request，並沒有超過1000個，在16:10時到期歸零，16:20使用了16:10~17:10的time window的1000個扣打去送出500個request。

* 第二種: time window是會隨著時間移動的，在t時間送出的request，會檢視t時間前的一個小時內是否有送出超過1000個。以上面的例子來說，在16:20發送request時，會去看在15:20~16:20這一小時內送出了多少request，因為在15:30已經送出了950個，所以在16:20送出第11個request時，就會因為超過1000個request，故無法成功送到伺服器。

我是按照第二種方式來implement的，而因為實作方式中並沒有time window到期的概念，所以`X-RateLimit-Reset`會是距離最晚成功傳送至server端的request後一個小時的時間，我自己又多增加了`X-RateLimit-WaitingTime`，則是在一小時內傳送過超過1000個request後，距離下一次可以發送request的時間。

下圖為一般正常傳送時的截圖。
![](https://i.imgur.com/uATuqMQ.png)

再下圖為一小時內傳送超過1000次的截圖。
![](https://i.imgur.com/ryFX9fl.png)