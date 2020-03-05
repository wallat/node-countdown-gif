'use strict';

const fs = require('fs');
const path = require('path');
const GIFEncoder = require('gifencoder');
const Canvas = require('canvas');
const { createCanvas, registerFont } = require('canvas')
const moment = require('moment');

module.exports = {
    /**
     * Initialise the GIF generation
     * @param {number} width
     * @param {number} height
     * @param {string} textColor
     * @param {string} bgColor
     * @param {string} name
     * @param {number} frames
     * @param {string} time
     * @param {string} digitFontFamily
     * @param {number} digitFontSize
     * @param {string} unitLocale
     * @param {string} unitFontFamily
     * @param {number} unitFontSize
     * @param {string} passedMsgFontFamily
     * @param {number} passedMsgFontSize
     * @param {string} passedMsg
     * @param {requestCallback} cb - The callback that is run once complete.
     */
    init: function(args={}, cb){
        registerFont(path.resolve(__dirname, "fonts/Roboto_Mono/RobotoMono-Medium.ttf"), { family: 'RobotoMono' })
        registerFont(path.resolve(__dirname, "fonts/Noto_Sans_TC/NotoSansTC-Medium.otf"), { family: 'NotoSans' })

        this.args = args = Object.assign({
            width: 400,
            height: 200,
            textColor: 'ffffff',
            bgColor: '000000',
            name: null,
            frames: 30,
            time: null,
            digitFontFamily: "NotoSans",
            digitFontSize: null, // null means calc automatically
            unitLocale: "Days_Hours_Mins_Secs",
            unitFontFamily: "NotoSans",
            unitFontSize: null, // null means calc automatically
            passedMsgFontFamily: "NotoSans",
            passedMsgFontSize: null, // null means calc automatically
            passedMsg: "Date has passed"
        }, args)

        // Set some sensible upper / lower bounds
        this.width = this.clamp(args.width, 150, 1024);
        this.height = this.clamp(args.height, 150, 1024);
        this.frames = this.clamp(args.frames, 1, 120);

        this.bg = '#' + args.bgColor;
        this.textColor = '#' + args.textColor;
        this.name = args.name;

        // loop optimisations
        this.halfWidth = Number(this.width / 2);
        this.halfHeight = Number(this.height / 2);

        this.encoder = new GIFEncoder(this.width, this.height);
        this.canvas = createCanvas(this.width, this.height);
        this.ctx = this.canvas.getContext('2d');

        // calculate the time difference (if any)
        let timeResult = this.time(args.time);

        // start the gif encoder
        this.encode(timeResult, cb);
    },
    /**
     * Limit a value between a min / max
     * @link http://stackoverflow.com/questions/11409895/whats-the-most-elegant-way-to-cap-a-number-to-a-segment
     * @param number - input number
     * @param min - minimum value number can have
     * @param max - maximum value number can have
     * @returns {number}
     */
    clamp: function(number, min, max){
        return Math.max(min, Math.min(number, max));
    },
    /**
     * Calculate the diffeence between timeString and current time
     * @param {string} timeString
     * @returns {string|Object} - return either the date passed string, or a valid moment duration object
     */
    time: function (timeString) {
        // grab the current and target time
        let target = moment(timeString);
        let current = moment();

        // difference between the 2 (in ms)
        let difference = target.diff(current);

        // either the date has passed, or we have a difference
        if(difference <= 0){
            return this.args.passedMsg;
        } else {
            // duration of the difference
            return moment.duration(difference);
        }
    },
    /**
     * Encode the GIF with the information provided by the time function
     * @param {string|Object} timeResult - either the date passed string, or a valid moment duration object
     * @param {requestCallback} cb - the callback to be run once complete
     */
    encode: function(timeResult, cb){
        let enc = this.encoder;
        let ctx = this.ctx;
        let tmpDir = process.cwd() + '/tmp/';

        // create the tmp directory if it doesn't exist
        if (!fs.existsSync(tmpDir)){
            fs.mkdirSync(tmpDir);
        }

        let filePath = tmpDir + this.name + '.gif';

        // pipe the image to the filesystem to be written
        let imageStream = enc
                .createReadStream()
                    .pipe(fs.createWriteStream(filePath));
        // once finised, generate or serve
        imageStream.on('finish', () => {
            // only execute callback if it is a function
            typeof cb === 'function' && cb();
        });

        let digitFontSize = (this.args.digitFontSize ? this.args.digitFontSize : Math.floor(this.width/8)) + 'px';
        let digitFontFamily = this.args.digitFontFamily

        let unitFontSize = (this.args.unitFontSize ? this.args.unitFontSize : Math.floor(this.width/24)) + 'px';
        let unitFontFamily = this.args.unitFontFamily

        let marginBetweenDigits = this.width/18
        let marginBetweenDigitNUnit = 0

        let unitTokens = this.args.unitLocale.split("_")

        // measure digits sizes
        ctx.font = [digitFontSize, digitFontFamily].join(' ');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        let singleDigitBB = ctx.measureText("0")

        // measure unit sizes
        ctx.font = [unitFontSize, unitFontFamily].join(' ');
        ctx.textBaseline = 'top';
        let singleUnitBB = ctx.measureText(unitTokens[0])

        // start encoding gif with following settings
        enc.start();
        enc.setRepeat(0);
        enc.setDelay(1000);
        enc.setQuality(10);

        // if we have a moment duration object
        if(typeof timeResult === 'object'){
            let dayDigits = Math.max(2, Math.ceil(Math.log10(timeResult.asDays())))

            let textWidth = singleDigitBB.width*(dayDigits+6)+marginBetweenDigits*3
            let textHeight = singleDigitBB.emHeightDescent+marginBetweenDigitNUnit+singleUnitBB.emHeightDescent

            let positions = {
                days: {
                    x: this.halfWidth-textWidth/2+(singleDigitBB.width*dayDigits)/2,
                    digitY: this.halfHeight-textHeight/2,
                    unitY: this.halfHeight+textHeight/2
                },
                hours: {
                    x: this.halfWidth-textWidth/2+singleDigitBB.width*dayDigits+marginBetweenDigits+singleDigitBB.width,
                    digitY: this.halfHeight-textHeight/2,
                    unitY: this.halfHeight+textHeight/2
                },
                minutes: {
                    x: this.halfWidth-textWidth/2+singleDigitBB.width*dayDigits+marginBetweenDigits*2+singleDigitBB.width*3,
                    digitY: this.halfHeight-textHeight/2,
                    unitY: this.halfHeight+textHeight/2
                },
                seconds: {
                    x: this.halfWidth-textWidth/2+singleDigitBB.width*dayDigits+marginBetweenDigits*3+singleDigitBB.width*5,
                    digitY: this.halfHeight-textHeight/2,
                    unitY: this.halfHeight+textHeight/2
                },
            }

            for(let i = 0; i < this.frames; i++){
                // extract the information we need from the duration
                let days = Math.floor(timeResult.asDays());
                let hours = Math.floor(timeResult.asHours() - (days * 24));
                let minutes = Math.floor(timeResult.asMinutes()) - (days * 24 * 60) - (hours * 60);
                let seconds = Math.floor(timeResult.asSeconds()) - (days * 24 * 60 * 60) - (hours * 60 * 60) - (minutes * 60);

                // make sure we have at least 2 characters in the string
                days = (days.toString().length == 1) ? '0' + days : days;
                hours = (hours.toString().length == 1) ? '0' + hours : hours;
                minutes = (minutes.toString().length == 1) ? '0' + minutes : minutes;
                seconds = (seconds.toString().length == 1) ? '0' + seconds : seconds;

                // paint BG
                ctx.fillStyle = this.bg;
                ctx.fillRect(0, 0, this.width, this.height);

                // paint text
                ctx.fillStyle = this.textColor;

                // draw digits
                ctx.font = [digitFontSize, digitFontFamily].join(' ');
                ctx.textBaseline = 'top';
                ctx.fillText(days, positions.days.x, positions.days.digitY)
                ctx.fillText(hours, positions.hours.x, positions.hours.digitY)
                ctx.fillText(minutes, positions.minutes.x, positions.minutes.digitY)
                ctx.fillText(seconds, positions.seconds.x, positions.seconds.digitY)

                // draw units
                ctx.font = [unitFontSize, unitFontFamily].join(' ');
                ctx.textBaseline = 'bottom';
                ctx.fillText(unitTokens[0], positions.days.x, positions.days.unitY)
                ctx.fillText(unitTokens[1], positions.hours.x, positions.hours.unitY)
                ctx.fillText(unitTokens[2], positions.minutes.x, positions.minutes.unitY)
                ctx.fillText(unitTokens[3], positions.seconds.x, positions.seconds.unitY)

                // add finalised frame to the gif
                enc.addFrame(ctx);

                // remove a second for the next loop
                timeResult.subtract(1, 'seconds');
            }
        } else { // Date has passed so only using a string
            // BG
            ctx.fillStyle = this.bg;
            ctx.fillRect(0, 0, this.width, this.height);

            // Text
            let passedMsgFontSize = (this.args.passedMsgFontSize ? this.args.passedMsgFontSize : this.width/12) + 'px'
            ctx.font = [passedMsgFontSize, this.args.passedMsgFontFamily].join(' ');
            ctx.textBaseline = 'middle';
            ctx.fillStyle = this.textColor;
            ctx.fillText(timeResult, this.halfWidth, this.halfHeight);
            enc.addFrame(ctx);
        }

        // finish the gif
        enc.finish();
    }
};
