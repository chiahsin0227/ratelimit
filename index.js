const redis =  require("redis");
const express = require("express");

const app = express();

const redisClient = redis.createClient({
    host: '127.0.0.1',
    port: 6379,
});

redisClient.on('error', (err) => {
    console.log('Redis error: ', err);
});

function RateLimit(req, res, next){
    if(!redisClient){
        console.log('Redis error: ', err);
    }
    redisClient.get(req.ip, (err, record) => {
        if(err){
            console.log(err);
        }
        const nowTime = new Date().getTime();
        if(!record){
            let newRecord = [];
            newRecord.push({
                req_timestamp : nowTime,
                request_count : 1
            });
            redisClient.set(req.ip, JSON.stringify(newRecord));
            next();
        }
        else{
            let reqRecord = JSON.parse(record);
            //console.log(reqRecord);
            let start_timestamp = new Date(nowTime - 60*60*1000);
            let reqInAnHour = reqRecord.filter( d => {
                return d.req_timestamp >= start_timestamp;
            });
            //console.log(reqInAnHour);
            let totalRequest = reqInAnHour.reduce((accumulator, entry) => {
                return accumulator + entry.request_count;
            }, 0);
            console.log(totalRequest);
            if(totalRequest >= 1000){
                let lastRequest = reqInAnHour[reqInAnHour.length - 1].req_timestamp;
                let firstRequest = reqInAnHour[reqInAnHour.length - 1000].req_timestamp;
                let remainTime = Math.floor((new Date(lastRequest + 60*60*1000 - nowTime))/1000);
                let waitingTime = Math.floor((new Date(firstRequest + 60*60*1000 - nowTime))/1000);
                res.set({
                    "X-RateLimit-Remaining" : 0,
                    "X-RateLimit-Reset" : Math.floor(remainTime/60) + "min" + remainTime%60 + "sec",
                    "X-RateLimit-WaitingTime" : Math.floor(waitingTime/60) + "min" + waitingTime%60 + "sec",
                })
                res.status(429).send("too many requests");
            }
            else{
                res.set({
                    "X-RateLimit-Remaining" : 1000 - totalRequest,
                    "X-RateLimit-Reset" : "60min"
                })
                reqRecord.push({
                    req_timestamp : nowTime,
                    request_count : 1
                });
                redisClient.set(req.ip, JSON.stringify(reqRecord));
                next();
            }
        }
    });
}

app.get("/", RateLimit, (req, res) => {
    res.status(200).send("OK");
});

app.listen(3000, (err) => {
    if(err){
        console.log(err);
    }
    else{
        console.log("Runnung at http://localhost:3000/")
    }
});