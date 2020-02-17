"use strict";

const axios  = require('axios');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const _      = require('underscore');
const moment = require('moment');
const config = require('./config.json');
const hook   = new Webhook(config.hook);

let seenMaps = [], grouped = [], embed, sec_num, minutes, seconds, diff_formatted, curr_date;

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

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
        response["data"].forEach(nameMap => {
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

        // TO FIX vvvvvvvvvvvvvvvvv

        embed = new MessageBuilder()
        .setTitle(response["data"][1]["artist"] + ' - ' + response["data"][1]["title"])
        .setAuthor('New approved beatmap by ' + response["data"][1]["creator"], 'http://s.ppy.sh/a/' + response["data"][1]["creator_id"], 'http://osu.ppy.sh/users/' + response["data"][1]["creator_id"])
        .setURL('http://osu.ppy.sh/beatmapsets/' + bm_id)
        .setDescription('`Song length: ' + response["data"][1]["total_length"].toMMSS() + '`' + /*'`[Send to osu direct](osu://s/' + bm_id + ')`' +*/ ' \n\n' + diff_formatted)
        .setColor(15038374)
        .setThumbnail('https://b.ppy.sh/thumb/' + bm_id + 'l.jpg')
        .setImage('https://assets.ppy.sh/beatmaps/' + bm_id + '/covers/cover.jpg')
        .setFooter('Approved at ' + moment(response["data"][1]["approved_date"]).format('MMMM Do YYYY, h:mm:ss a'), 'https://i.imgur.com/h87iocW.png');

        hook.send(embed);
    })
    .catch(error => {
        console.log(error);
    });
}

async function main() {
    while(true) {
        axios.get('http://worldclockapi.com/api/json/utc/now')
        .then(response => {
            curr_date = response["data"]["currentDateTime"].substring(0, 10);
            axios.get('https://osu.ppy.sh/api/get_beatmaps?k=' + config.key + '&a=0&limit=100&since=' + curr_date + ' 00:00:00')
            .then(response => {
                grouped = Object.entries(_.groupBy(response.data, 'beatmapset_id'));
                grouped.forEach(set => {
                    if(!seenMaps.includes(set[0])) {
                        seenMaps.push(set[0]);
                        sendEmbed(set[0]);
                    }
                });
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