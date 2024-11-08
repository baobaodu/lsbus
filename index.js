const App = {
    data() {
        return {
            stationUrlTemplate: 'http://223.111.7.137:2001/BusService/Query_RouteStatData/?RouteID=${RouteID}&timeStamp=${timestamp}&Random=${random}&SignKey=${signKey}',
            carUrlTemplate: 'http://223.111.7.137:2001/BusService/Query_ByStationIDReturnAll/?RouteID=${RouteID}&IsmainsubCombine=1&StationID=${StationID}&timeStamp=${timestamp}&Random=${random}&SignKey=${signKey}',
            fetchKey: 'f7b2914081174a55bf563056fb25d3ae',
            refreshTime: null,
            currentLineLocalCode: '',
            lineList: [{
                code: 'line230',
                name: '230路',
                routeId: '203001',
                stationId1: '2016',
                stationId2: '166',
            }, {
                code: 'line225',
                name: '225路',
                routeId: '202501',
                stationId1: '2016',
                stationId2: '166',
            }, {
                code: 'lineNanLin',
                name: '南林大快线',
                routeId: '603201',
                stationId1: '84210430080027015000',
                stationId2: '08210430080106370000',
            }],
            segmentList: [],
            currentSegmentId: null,
            /*stationList: [],
            carList: [],*/
            importantStationNameList: ['市民之家', '康居路', '农科站', '金谷佳苑'],
            segmentListCache: {}
        };
    },
    mounted() {
        this.init();
    },
    methods: {
        init() {
            // 默认线路230
            this.currentLineLocalCode = 'line230'
            // 首次刷新线路（站点+车辆）
            this.refreshLine()
            // 定时刷新车辆
            setInterval(() => {
                this.refreshCar()
            }, 5000)
        },
        refreshLine() {
            /*let line = this.getCurrentLine()
            let cachedSegmentList = this.segmentListCache[line.code]
            if (!cachedSegmentList) {
                //
            }*/
            this.clearLine()
            let signData = this.fetchSignPart()
            let paramData = this.fetchParamPart()
            let url = this.stationUrlTemplate.replace('${timestamp}', signData.timestamp)
                .replace('${random}', signData.random)
                .replace('${signKey}', signData.signKey)
                .replace('${RouteID}', this.encryptCode(paramData.RouteID))
            this.doPost(url, (res) => {
                let route = res.result[0]
                // 来回区间
                for (let i = 0; i < route.SegmentList.length; i++) {
                    let segment = route.SegmentList[i]
                    this.segmentList.push({
                        id: segment.SegmentID,
                        name: segment.SegmentName,
                        stationList: segment.StationList.map(o => {
                            return {
                                id: o.StationID,
                                name: o.StationName,
                            }
                        })
                    })
                    if (i === 0) {
                        this.currentSegmentId = segment.SegmentID
                    }
                }
                // 站点
                this.changeSegment()
                // car
                this.refreshCar()
            })
        },
        refreshCar() {
            let signData = this.fetchSignPart()
            let paramData = this.fetchParamPart()
            let stationIdList = [paramData.StationID1, paramData.StationID2]
            for (let i = 0; i < stationIdList.length; i++) {
                let carUrl = this.carUrlTemplate.replace('${timestamp}', signData.timestamp)
                    .replace('${random}', signData.random)
                    .replace('${signKey}', signData.signKey)
                    .replace('${RouteID}', this.encryptCode(paramData.RouteID))
                    .replace('${StationID}', this.encryptCode(stationIdList[i]))
                this.doPost(carUrl, (res) => {
                    let realtime = res.result[0]
                    let segment = this.findSegmentByStationId(realtime.StationID)
                    segment.carList = realtime.RealtimeInfoList.map(o => {
                        return {
                            id: o.BusID,
                            name: o.BusName,
                            stationId: o.StationID,
                            stationName: o.ArriveStaName,
                            arriveTime: o.ArriveTime,
                        }
                    })
                    segment.firstLastTimeStr = realtime.FirtLastShiftInfo
                    this.refreshTime = new Date(realtime.ServerTime)
                })
            }
        },
        findSegmentByStationId(stationId) {
            for (let i = 0; i < this.segmentList.length; i++) {
                if (this.segmentList[i].stationList.some(o => o.id === stationId)) {
                    return this.segmentList[i]
                }
            }
        },
        changeLine() {
            this.refreshLine()
        },
        clearLine() {
            /*this.carList.splice(0, this.carList.length)
            this.stationList.splice(0, this.stationList.length)*/
            this.segmentList.splice(0, this.segmentList.length)
        },
        changeSegment() {
            //
        },
        doPost(serviceUrl, callback) {
            let token = this.dateFormat('yyyyMMddhhmmss', new Date()) + '999999'
            let random = Math.random()
            let is_app_login = 0
            let url = 'https://www.njlsgj.com/mobile/service/httpget?token=' + token + '&_random=' + random + '&is_app_login=' + is_app_login
            $.post(url, 'url=' + encodeURIComponent(serviceUrl), (res) => {
                callback(res)
            })
        },
        fetchSignPart() {
            // 20231126133740
            let timestamp = this.dateFormat('yyyyMMddhhmmss', new Date())
            let random = parseInt(100 + Math.random() * 900)
            let signKey = sha256.hmac(this.fetchKey, timestamp + random)
            return {
                timestamp: timestamp,
                random: random,
                signKey: signKey
            }
        },
        fetchParamPart() {
            let line = this.getCurrentLine()
            return {
                'RouteID': line.routeId,
                'StationID1': line.stationId1,
                'StationID2': line.stationId2,
            }
        },
        getCurrentLine() {
            for (let i = 0; i < this.lineList.length; i++) {
                if (this.lineList[i].code === this.currentLineLocalCode) {
                    return this.lineList[i]
                }
            }
        },
        encryptCode(code) {
            let now = new Date();
            let w = now.getDay();
            let d = now.getDate();
            let num = (d - w);
            if (num <= 10) {
                num += 7;
            }
            let encodeString = '';
            for (let i = 0; i < code.length; i++) {
                encodeString += String.fromCharCode(code[i].charCodeAt() + num);
            }
            return encodeString;
        },
        dateFormat(fmt, date) {
            let o = {
                "M+": date.getMonth() + 1,                 //月份
                "d+": date.getDate(),                    //日
                "h+": date.getHours(),                   //小时
                "m+": date.getMinutes(),                 //分
                "s+": date.getSeconds(),                 //秒
                "q+": Math.floor((date.getMonth() + 3) / 3), //季度
                "S": date.getMilliseconds()             //毫秒
            }
            if (/(y+)/.test(fmt))
                fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length))
            for (let k in o)
                if (new RegExp("(" + k + ")").test(fmt))
                    fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)))
            return fmt
        },
        isImportantStation(stationName) {
            return this.importantStationNameList.indexOf(stationName) > -1
        },
        getStationCarDesc(stationId) {
            if (!stationId || !this.carList) {
                return ''
            }
            return this.carList.filter(o => o.stationId === stationId).map(o => {
                return '🚌 ' + o.name + ' ' + o.arriveTime.split(' ')[1]
            }).join('、')
        }
    },
    computed: {
        refreshTimeStr: function () {
            if (!this.refreshTime) {
                return ''
            }
            return this.refreshTime.toLocaleTimeString()
        },
        stationList: function () {
            let segment = this.segmentList.find(o => o.id === this.currentSegmentId)
            if (!segment) {
                return []
            }
            return segment.stationList
        },
        carList: function () {
            let segment = this.segmentList.find(o => o.id === this.currentSegmentId)
            if (!segment) {
                return []
            }
            return segment.carList
        },
        firstLastTimeStr: function () {
            let segment = this.segmentList.find(o => o.id === this.currentSegmentId)
            if (!segment) {
                return '首末班：'
            }
            return segment.firstLastTimeStr
        },
    }
};
const app = Vue.createApp(App);
app.use(ElementPlus);
app.mount("#app");
