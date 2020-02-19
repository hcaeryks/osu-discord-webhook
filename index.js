"use strict";

const axios    = require('axios');
const Discord  = require('discord.js');
const _        = require('underscore');
const moment   = require('moment');
const exitHook = require('exit-hook');
const config   = require('./config.json');
const hook     = new Discord.WebhookClient(config.id, config.token);

let seenMaps   = [], grouped = [], embed, sec_num, minutes, seconds, diff_formatted, curr_date, approval_type, first_init = 1, thumbnail;

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

exitHook(() => {
    sendMessage("Can't connect to the application!")
});

String.prototype.toMMSS = function () {
    sec_num = parseInt(this, 10);
    minutes = Math.floor(sec_num / 60);
    seconds = sec_num - (minutes * 60);

    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return minutes+':'+seconds;
}

function sendEmbed(bm_id) {
    axios.get('https://osu.ppy.sh/api/get_beatmaps?k=' + config.key + '&s=' + bm_id)
    .then(response => {
        diff_formatted = "";
        response["data"].sort((a, b) => (a.difficultyrating < b.difficultyrating) ? 1 : -1 ).sort((a, b) => (a.mode < b.mode) ? 1 : -1).forEach(nameMap => {
            diff_formatted += "`" + (Math.round(parseFloat(nameMap["difficultyrating"]) * 100) / 100).toFixed(2) + "☆ ";
            switch(parseInt(nameMap["mode"])) {
                case 0:
                    diff_formatted += "[osu!standard] ";
                    break;
                case 1:
                    diff_formatted += "[osu!taiko] ";
                    break;
                case 2:
                    diff_formatted += "[osu!catch] ";
                    break;
                case 3:
                    diff_formatted += "[osu!mania] ";
                    break;
                default:
                    diff_formatted += "[osu!] ";
                    break;
            }
            diff_formatted += nameMap["version"] + "`\n";
        });

        switch(parseInt(response["data"][0]["approved"])) {
            case -2:
                approval_type = " graveyarded";
                thumbnail = "https://i.imgur.com/1k2YqGp.png";
                break;
            case -1:
                approval_type = " WIP";
                thumbnail = "https://i.imgur.com/1k2YqGp.png";
                break;
            case 0:
                approval_type = " pending";
                thumbnail = "https://i.imgur.com/1k2YqGp.png";
                break;
            case 1:
                approval_type = " ranked";
                thumbnail = "https://i.imgur.com/hfdujvi.png";
                break;
            case 2:
                approval_type = " approved";
                thumbnail = "https://i.imgur.com/lqsQe0T.png";
                break;
            case 3:
                approval_type = " qualified";
                thumbnail = "https://i.imgur.com/lqsQe0T.png";
                break;
            case 4:
                approval_type = " loved";
                thumbnail = "https://i.imgur.com/R7dFUL5.png";
                break;
            default:
                approval_type = "";
                thumbnail = "https://i.imgur.com/1k2YqGp.png";
                break;
        }

        embed = new Discord.RichEmbed()
        .setTitle(response["data"][0]["artist"] + ' - ' + response["data"][0]["title"])
        .setAuthor('New' + approval_type + ' beatmap by ' + response["data"][0]["creator"], 'http://s.ppy.sh/a/' + response["data"][0]["creator_id"], 'http://osu.ppy.sh/users/' + response["data"][0]["creator_id"])
        .setURL('http://osu.ppy.sh/beatmapsets/' + bm_id)
        .setDescription('')
        .addField('Set information: ', '`Song length: ' + response["data"][0]["total_length"].toMMSS() + '`\n`' + "BPM: " + response["data"][0]["bpm"] + '`', false)
        .addField('Difficulties: ', diff_formatted, false)
        .addField('Direct download: ', ' [Official server](https://osu.ppy.sh/beatmapsets/' + bm_id + '/download) || [Bloodcat mirror](https://bloodcat.com/osu/s/' + bm_id + ')\n', false)
        .setColor([229,119,166])
        .setThumbnail(thumbnail)
        .setImage('https://assets.ppy.sh/beatmaps/' + bm_id + '/covers/cover.jpg')
        .setFooter('Approved at ' + moment(response["data"][0]["approved_date"]).format('MMMM Do YYYY, h:mm:ss a') + ' [UTC]', 'https://i.imgur.com/h87iocW.png');


        hook.send(embed);
    })
    .catch(error => {
        console.log(error);
    });
}

function sendMessage(message) {
    embed = new Discord.RichEmbed()
    .setAuthor(message)
    .setColor([119, 199, 229]);

    hook.send(embed);
}

async function main() {
    while(true) {
        console.log("Checking for new maps...");
        axios.get('http://worldclockapi.com/api/json/utc/now')
        .then(response => {
            curr_date = response["data"]["currentDateTime"].substring(0, 10);
            axios.get('https://osu.ppy.sh/api/get_beatmaps?k=' + config.key + '&a=0&limit=100&since=' + curr_date + ' 00:00:00')
            .then(response => {
                grouped = Object.entries(_.groupBy(response.data, 'beatmapset_id'));
                grouped.forEach(set => {
                    if(!seenMaps.includes(set[0])) {
                        seenMaps.push(set[0]);
                        if(first_init == 0) {
                            sendEmbed(set[0]);
                        }
                    }
                });

                if(first_init == 1) {
                    sendMessage('Connected successfully!');
                    first_init = 0;
                }

            })
            .catch(error => {
                console.log(error);
            });
        })
        .catch(error => {
            console.log(error);
        });

        await sleep(30000);
    }
}

main();
