var innerAudioContext = wx.createInnerAudioContext();
var myCharts = require("../../../utils/wxcharts.js")//引入一个绘图的插件

const devicesId = "562324123" // 填写在OneNet上获得的devicesId 形式就是一串数字 例子:9939133
const api_key = "LgaoqvCcR2SlZl861B1AVpZH9DE=" // 填写在OneNet上的 api-key 例子: VeFI0HZ44Qn5dZO14AuLbWSlSlI=

Page({
  data: {
    volume: 0,
    search_status: [{
        id:1,
        name:'摇篮曲',
        count: 0
      },{
        id: 2,
        name: '图书馆',
        count: 0
      },{
        id: 3,
        name: 'Bandari',
        count: 0
      }, {
        id: 4,
        name: '童谣',
        count: 0
      }, {
        id: 5,
        name: '周杰伦',
        count: 0
      }, {
        id: 6,
        name: '陈奕迅',
        count: 0
      }, {
        id: 7,
        name: '汪峰',
        count: 0
    }],
    keywords: '你好',
    timer: 6000,
    type_id: 0,
    songmid: "test",
    vkey: "test",
    count: 0,
    albumid: 0,
    imgsrc: "../../../images/song.png",
    songname: "初始化中……"
  },

  /**
   * @description 页面下拉刷新事件
   */
  onPullDownRefresh: function () {
    wx.showLoading({
      title: "正在获取"
    })
    this.getDatapoints().then(datapoints => {
      this.update(datapoints)
      wx.hideLoading()
    }).catch((error) => {
      wx.hideLoading()
      console.error(error)
    })
  },

  /**
   * @description 页面加载生命周期
   */
  onLoad: function () {

    //每隔6s自动获取一次数据进行更新
    const timer = setInterval(() => {
      this.getDatapoints().then(datapoints => {
        this.update(datapoints)
      })
    }, this.data.timer)

    

    wx.showLoading({
      title: '加载中'
    })

    this.getDatapoints().then((datapoints) => {
      wx.hideLoading()
    }).catch((err) => {
      wx.hideLoading()
      console.error(err)
      clearInterval(timer) //首次渲染发生错误时禁止自动刷新
    })
  },
  
  getMusicList: function(){
    wx.request({
      url: `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?aggr=1&cr=1&flag_qc=0&p=1&n=30&w=${this.data.keywords}`,
      method: 'GET',
      header:{
        'content-type': 'application/json'
      },
      success: (res) => {
        this.setData({
          songmid: JSON.parse(res.data.slice(9, -1)).data.song.list[this.data.search_status[this.data.type_id].count].songmid,
          albumid: JSON.parse(res.data.slice(9, -1)).data.song.list[this.data.search_status[this.data.type_id].count].albumid,
          songname: JSON.parse(res.data.slice(9, -1)).data.song.list[this.data.search_status[this.data.type_id].count].songname + " - " + JSON.parse(res.data.slice(9, -1)).data.song.list[this.data.search_status[this.data.type_id].count].singer[0].name
        })
        this.data.search_status[this.data.type_id].count++
        this.getMusicVkey()
      },
      fail: (err) => {
        reject(err)
      }
    })
  },

getMusicVkey: function () {
    wx.request({
      url: `https://c.y.qq.com/base/fcgi-bin/fcg_music_express_mobile3.fcg?format=json205361747&platform=yqq&cid=205361747&songmid=${this.data.songmid}&filename=C400${this.data.songmid}.m4a&guid=126548448`,
      method: 'GET',
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        this.setData({
          vkey: res.data.data.items[0].vkey,
          imgsrc: `http://imgcache.qq.com/music/photo/album_300/${this.data.albumid % 100}/300_albumpic_${this.data.albumid}_0.jpg`
        })
        console.log(this.data.songmid)
        console.log(this.data.vkey)
        this.getMusicFile()
      },
      fail: (err) => {
        reject(err)
      }
    })
  },

  getMusicFile: function(){
    innerAudioContext.src = `http://ws.stream.qqmusic.qq.com/C400${this.data.songmid}.m4a?fromtag=0&guid=126548448&vkey=${this.data.vkey}`;
    innerAudioContext.play();
  },

  setMusicPause: function(){
    innerAudioContext.pause();
  },

  /**
   * 向OneNet请求当前设备的数据点
   * @returns Promise
   */
  getDatapoints: function () {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `https://api.heclouds.com/devices/${devicesId}/datapoints?datastream_id=Light,Temperature,Humidity,volume&limit=1`,
        /**
         * 添加HTTP报文的请求头, 
         * 其中api-key为OneNet的api文档要求我们添加的鉴权秘钥
         * Content-Type的作用是标识请求体的格式, 从api文档中我们读到请求体是json格式的
         * 故content-type属性应设置为application/json
         */
        header: {
          'content-type': 'application/json',
          'api-key': api_key
        },
        success: (res) => {
          console.log(res)
          const status = res.statusCode
          const response = res.data
          if (status !== 200) { // 返回状态码不为200时将Promise置为reject状态
            reject(res.data)
            return ;
          }
          if (response.errno !== 0) { //errno不为零说明可能参数有误, 将Promise置为reject
            reject(response.error)
            return ;
          }

          if (response.data.datastreams.length === 0) {
            reject("当前设备无数据, 请先运行硬件实验")
          }
          var that = this
          if (this.data.type_id !== Math.floor(response.data.datastreams[0].datapoints[0].value / 100)){
            this.setData({
              type_id: Math.floor(response.data.datastreams[0].datapoints[0].value / 100),
              keywords: this.data.search_status[Math.floor(response.data.datastreams[0].datapoints[0].value / 100)].name,
              count: 0
            })
            that.setMusicPause()
            that.getMusicList()
          }
          else{
            if(that.data.count*6>innerAudioContext.duration){
              this.setData({
                type_id: Math.floor(response.data.datastreams[0].datapoints[0].value / 100),
                keywords: this.data.search_status[Math.floor(response.data.datastreams[0].datapoints[0].value / 100)].name,
                count: 0
              })
              that.setMusicPause()
              that.getMusicList()
            }
            that.data.count++;
          }

          //程序可以运行到这里说明请求成功, 将Promise置为resolve状态
          resolve({
            temperature: response.data.datastreams[0].datapoints.reverse(),
            light: response.data.datastreams[1].datapoints.reverse(),
            humidity: response.data.datastreams[2].datapoints.reverse()
          })
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  },

  /**
   * @param {Object[]} datapoints 从OneNet云平台上获取到的数据点
   * 传入获取到的数据点, 函数自动更新图标
   */
  update: function (datapoints) {
    const wheatherData = this.convert(datapoints);

  },

  /**
   * 
   * @param {Object[]} datapoints 从OneNet云平台上获取到的数据点
   * 传入数据点, 返回使用于图表的数据格式
   */
  convert: function (datapoints) {
    var categories = [];
    var humidity = [];
    var light = [];
    var tempe = [];

    var length = datapoints.humidity.length
    for (var i = 0; i < length; i++) {
      categories.push(datapoints.humidity[i].at.slice(5, 19));
      humidity.push(datapoints.humidity[i].value);
      light.push(datapoints.light[i].value);
      tempe.push(datapoints.temperature[i].value);
    }
    return {
      categories: categories,
      humidity: humidity,
      light: light,
      tempe: tempe
    }
  },

})
