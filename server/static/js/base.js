var domain = "http://127.0.0.1:5000"

// 歌词情绪分析
function emotion(song_id) {
    $.ajax({
        url: domain + '/lyric_emotion/' + song_id,
        success: function (res) {
            res = JSON.parse(res);
            // var song = res['name'];
            var data = res['data'];
            // var dom = $('#song_emotion');

            // dom[0].innerHTML = song + '情感分析';
            // console.log();
            var myChart = echarts.init(document.getElementById('lyric_emotion'));
            var option;

            option = {
                backgroundColor: 'rgba(1,202,217,.2)',
                tooltip: {
                    formatter: function (params) {
                        var data = params.data;
                        return `第${data[0]}句, 情感得分${data[1]}`;
                    },
                    position: 'right'
                },
                grid: {
                    top: 10,
                    bottom: 30,
                    left: 40,
                    right: 25
                },
                xAxis: {
                    axisLabel: {
                        textStyle: {
                            color: '#fff'
                        }
                    }
                },
                yAxis: {
                    axisLabel: {
                        textStyle: {
                            color: '#fff'
                        }
                    }
                },
                series: [{
                    symbolSize: 15,
                    data: data,
                    type: 'scatter',
                    itemStyle: {
                        color: function (params) {
                            if (params.data[1] > 0) return '#2ecc71';
                            return '#c0392b';
                        }
                    },
                }]
            };
            option && myChart.setOption(option);
        }
    })
}


// 用户分布
function user_distribution(song_id) {
    $.ajax({
        url: domain + "/city/" + song_id,
        success: function (res) {
            res = JSON.parse(res);
            var myChart = echarts.init(document.getElementById('map'));
            var data = res['data'];
            var geoCoordMap = res['geo'];
            // 点的大小，越小越大
            var n = 0.5;
            if(Math.max(data) > 200)
                n = 2;
            var convertData = function (data) {
                var res = [];
                for (var i = 0; i < data.length; i++) {
                    var geoCoord = geoCoordMap[data[i].name];
                    if (geoCoord) {
                        res.push({
                            name: data[i].name,
                            value: geoCoord.concat(data[i].value / n)
                        });
                    }
                }
                return res;
            };

            myChart.setOption(option = {
                backgroundColor: 'rgba(1,202,217,.2)',
                tooltip: {
                    formatter: function (params) {
                        var nums = params.data.value[2] * n;
                        var name = params.data.name;
                        return `${name}\n${nums}`;
                    }
                },
                legend: {
                    left: 'left',
                    data: ['强', '中', '弱'],
                    textStyle: {
                        color: '#ccc'
                    }
                },
                geo: {
                    map: 'china',
                    show: true,
                    roam: true,
                    label: {
                        emphasis: {
                            show: false
                        }
                    },
                    itemStyle: {
                        normal: {
                            areaColor: '#091632',
                            borderColor: '#1773c3',
                            shadowColor: '#1773c3',
                            shadowBlur: 20
                        }
                    }
                },
                series: [
                    {
                        name: '城市',
                        type: 'scatter',
                        coordinateSystem: 'geo',
                        data: convertData(data),
                        symbolSize: function (val) {
                            return val[2] / 20;
                        },
                        label: {
                            normal: {
                                formatter: '{b}',
                                position: 'right',
                                show: false
                            },
                            emphasis: {
                                show: true
                            }
                        },
                        itemStyle: {
                            normal: {
                                color: '#F6E9CD'
                            }
                        }
                    },
                    {
                        name: '前5',
                        type: 'effectScatter',
                        coordinateSystem: 'geo',
                        data: convertData(data.sort(function (a, b) {
                            return b.value - a.value;
                        }).slice(0, 6)),
                        symbolSize: function (val) {
                            return val[2] / 20;
                        },
                        showEffectOn: 'render',
                        rippleEffect: {
                            brushType: 'stroke'
                        },
                        hoverAnimation: true,
                        label: {
                            normal: {
                                formatter: '{b}',
                                position: 'right',
                                show: true
                            }
                        },
                        itemStyle: {
                            normal: {
                                color: '#F6E9CD',
                                shadowBlur: 10,
                                shadowColor: '#333'
                            }
                        },
                        zlevel: 1
                    }
                ]
            });
        }
    })
}


// 评论emoji统计
function emoji(song_id) {
    $.ajax({
        url: domain + "/emoji/" + song_id,
        success: function (res) {
            res = JSON.parse(res);
            y = new Array();
            x = new Array();
            // console.log(res);
            for (var k in res) {
                y.push(k);
                x.push(res[k]);
            }
            var myChart = echarts.init(document.getElementById('emoji'));
            var option;
            option = {
                backgroundColor: 'rgba(1,202,217,.2)',
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    }
                },
                grid: {
                    left: '1%',
                    right: '5%',
                    bottom: '10%',
                    top: '10%',
                    containLabel: true
                },
                xAxis: {
                    type: 'value',
                    boundaryGap: [0, 0.01],
                    axisLabel: {
                        show: true,
                        textStyle: {
                            color: '#fff',  //更改坐标轴文字颜色
                            // fontSize : 14      //更改坐标轴文字大小
                        }
                    }
                },
                yAxis: {
                    type: 'category',
                    data: y.reverse(),
                    axisLabel: {
                        show: true,
                        textStyle: {
                            color: '#fff',  //更改坐标轴文字颜色
                            fontSize: 11
                        }
                    }
                },
                series: [
                    {
                        type: 'bar',
                        data: x.reverse(),
                        itemStyle: {
                            normal: {
                                //这里是重点
                                color: function (params) {
                                    //注意，如果颜色太少的话，后面颜色不会自动循环，最好多定义几个颜色
                                    var colorList = ['#c23531', '#2f4554', '#61a0a8', '#d48265', '#91c7ae', '#749f83', '#ca8622'];
                                    return colorList[params.dataIndex % colorList.length];
                                }
                            }
                        }
                    }
                ]
            };

            myChart.setOption(option);
        }
    })
}


// 用户VIP占比
function vip(song_id) {
    $.ajax({
        url: domain + "/vip/" + song_id,
        success: function (res) {
            var data = JSON.parse(res);
            var myChart = echarts.init(document.getElementById('vip'));

            let name = data.map((item) => item.name)
            let value = data.map((item) => item.value)
            let sum = value.reduce((a, b) => {
                return a + b
            })
            let color = [
                [
                    "rgb(24, 183, 142)",
                    "rgb(1, 179, 238)",
                    "rgb(22, 75, 205)",
                    "rgb(52, 52, 176)"
                ],
                ["rgba(24, 183, 142,0.1)",
                    "rgba(1, 179, 238,0.1)",
                    "rgba(22, 75, 205,0.1)",
                    "rgba(52, 52, 176,0.1)"
                ]
            ]
            let series = []
            let yAxis = []
            for (let i = 0; i < data.length; i++) {
                series.push({
                    name: "",
                    type: "pie",
                    clockWise: false, //顺时加载
                    hoverAnimation: false, //鼠标移入变大
                    radius: [65 - i * 10 + "%", 60 - i * 10 + "%"],
                    center: ["30%", "50%"],
                    label: {
                        show: false
                    },
                    itemStyle: {
                        label: {
                            show: false
                        },
                        labelLine: {
                            show: false
                        },
                        borderWidth: 5
                    },
                    data: [{
                        value: data[i].value,
                        name: data[i].name,
                    },
                        {
                            value: sum - data[i].value,
                            name: "",
                            itemStyle: {
                                color: 'transparent',
                            },
                            tooltip: {
                                show: false
                            },
                            hoverAnimation: false
                        }
                    ]
                })
                series.push({
                    name: "",
                    type: "pie",
                    silent: true,
                    z: 1,
                    clockWise: false, //顺时加载
                    hoverAnimation: false, //鼠标移入变大
                    radius: [65 - i * 10 + "%", 60 - i * 10 + "%"],
                    center: ["30%", "50%"],
                    label: {
                        show: false
                    },
                    itemStyle: {
                        label: {
                            show: false
                        },
                        labelLine: {
                            show: false
                        },
                        borderWidth: 5
                    },
                    data: [{
                        value: 7.5,
                        itemStyle: {
                            color: color[1][i],
                        },
                        tooltip: {
                            show: false
                        },
                        hoverAnimation: false
                    },
                        {
                            value: 2.5,
                            itemStyle: {
                                color: "rgba(0,0,0,0)",
                                borderWidth: 0
                            },
                            tooltip: {
                                show: false
                            },
                            hoverAnimation: false
                        }
                    ]
                })
                yAxis.push(((data[i].value / sum) * 100).toFixed(2) + "%")
            }
            option = {
                backgroundColor: 'rgba(1,202,217,.2)',
                legend: {
                    show: true,
                    icon: "circle",
                    top: "center",
                    left: "57%",
                    data: name,
                    orient: 'vertical',
                    formatter: (name) => {
                        return (
                            "{title|" + name + "}\n{value|" + data.find((item) => {
                                return item.name == name
                            }).value + "}{value|人}"
                        );
                    },
                    textStyle: {
                        rich: {
                            title: {
                                fontSize: 14,
                                lineHeight: 20,
                                color: "rgb(0, 178, 246)"
                            },
                            value: {
                                fontSize: 14,
                                lineHeight: 20,
                                color: "#fff"
                            }
                        }
                    }
                },
                tooltip: {
                    show: true,
                    trigger: "item",
                    formatter: "{b}:{c}({d}%)",
                    position: 'right'
                },
                grid: {
                    top: "13%",
                    left: "28%",
                    width: "40%",
                    height: "21%",
                    containLabel: false
                },
                yAxis: [{
                    type: "category",
                    inverse: true,
                    axisLine: {
                        show: false
                    },
                    axisTick: {
                        show: false
                    },
                    axisLabel: {
                        interval: 0,
                        inside: true,
                        textStyle: {
                            color: "#fff",
                            fontSize: 13
                        },
                        show: true
                    },
                    data: yAxis
                }],
                xAxis: [{
                    show: false,
                }],
                series: series
            };
            myChart.setOption(option);
        }
    })
}


function age(song_id) {
    $.ajax({
        url: domain + "/age/" + song_id,
        success: function (res) {
            res = JSON.parse(res);
            y = new Array();
            x = new Array();
            for (var k in res) {
                x.push(k);
                y.push(res[k]);
            }

            var myChart = echarts.init(document.getElementById('age'));
            var option;
            option = {
                backgroundColor: 'rgba(1,202,217,.2)',
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {            // 坐标轴指示器，坐标轴触发有效
                        type: 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: [
                    {
                        type: 'category',
                        data: x,
                        axisTick: {
                            alignWithLabel: true
                        },
                        axisLabel: {
                            show: true,
                            textStyle: {
                                color: '#fff',  //更改坐标轴文字颜色
                                fontSize: 11
                            }
                        }
                    }
                ],
                yAxis: [
                    {
                        type: 'value',
                        textStyle: {
                            color: '#fff',  //更改坐标轴文字颜色
                            // fontSize: 11
                        },
                        axisLabel: {
                            show: true,
                            textStyle: {
                                color: '#fff',  //更改坐标轴文字颜色
                                fontSize: 11
                            }
                        }
                    }
                ],
                series: [
                    {
                        // name: '直接访问',
                        type: 'bar',
                        barWidth: '60%',
                        data: y,
                        itemStyle: {
                            normal: {
                                label: {
                                    show: true, //开启显示
                                    position: 'top', //在上方显示
                                    textStyle: { //数值样式
                                        color: 'white',
                                        fontSize: 14
                                    }
                                }
                            },
                            color: new echarts.graphic.LinearGradient(
                                0, 0, 0, 1,
                                [
                                    {offset: 0, color: '#83bff6'},
                                    {offset: 0.5, color: '#188df0'},
                                    {offset: 1, color: '#188df0'}
                                ]
                            )
                        },
                        emphasis: {
                            itemStyle: {
                                color: new echarts.graphic.LinearGradient(
                                    0, 0, 0, 1,
                                    [
                                        {offset: 0, color: '#2378f7'},
                                        {offset: 0.7, color: '#2378f7'},
                                        {offset: 1, color: '#83bff6'}
                                    ]
                                )
                            }
                        }
                    }
                ]
            };

            option && myChart.setOption(option);

        }
    })
}

function comment_time(song_id) {
    $.ajax({
        url: domain + '/time/' + song_id,
        method: 'GET',
        success: function (res) {
            var chartDom = document.getElementById('time');
            var myChart = echarts.init(chartDom);
            var option;
            var data = JSON.parse(res);
            option = {
                backgroundColor: 'rgba(1,202,217,.2)',
                grid: {
                    left: '30',
                    bottom: '25',
                    top: '15',
                    right: '15'
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    axisLabel: {
                        color: '#fff'
                    },
                    axisLine: {
                        lineStyle: {
                            color: 'rgba(12,102,173,.5)',
                            width: 2,
                        }
                    },
                    data: data.x
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        color: '#fff'  //y轴上的字体颜色
                    },
                    axisLine: {
                        lineStyle: {
                            width: 2,
                            color: 'rgba(12,102,173,.5)',//y轴的轴线的宽度和颜色
                        }
                    }
                },
                tooltip: {
                    axisPointer: {
                        type: 'cross'
                    }
                },
                series: [
                    {
                        type: 'line',
                        smooth: true,
                        itemStyle: {
                            normal: {
                                color: '#09b0f5',
                            }
                        },
                        areaStyle: {
                            opacity: 0.8,
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                offset: 0,
                                color: 'rgba(128, 255, 165)'
                            }, {
                                offset: 1,
                                color: 'rgba(1, 191, 236)'
                            }])
                        },
                        symbolSize: 8,
                        data: data.y
                    }
                ]
            };
            option && myChart.setOption(option);
        }
    })
}


// 评论滚动开始
var main = document.getElementById("main");
var show1 = document.getElementsByClassName("show1")[0];
var show2 = document.getElementsByClassName("show2")[0];
var timeId;
show2.innerHTML = show1.innerHTML;
timeId = setInterval(play, 50);

function play() {
    if (main.scrollTop >= show1.offsetHeight) {
        main.scrollTop = 0;
    } else {
        main.scrollTop++;
        show1.innerHTML = show1.innerHTML + "";
    }
}

play();
main.onmouseover = function () {
    clearInterval(timeId)
};
main.onmouseout = function () {
    timeId = setInterval(play, 50);
};
// 评论滚动结束
