//用来存储音乐信息的对象数组
var musicInfos = [];
var defaultSongList = [];
var userSongList = [];
var songSearchResults = [];
var localMusicFiles = [];

//指向正在播放的音乐列表，
//比如musicInfos、songSearchResults、localMusicFiles其中一个
var currentPlayList;

//当前正在播放的音乐列表标识，
//0为musicInfos，1位songSearchResults,2位localMusicFiles
var currentPlayListIndex = 0;

//正在播放的歌曲
//属性跟musicInfos或者songSearchResults一样
var currentPlaySong;

//用来存储解析出来的歌词,格式如下[[time,lyricString],[time,lyricString],.....]
var lyricResult = [];

//歌词中歌手的信息，用于全屏歌词显示
var lyricArtistMessage = [];

//保存$("#lyricDiv ul li")的叠加高度值
var lyricHeight = [];

//网易云获取歌曲下载地址接口
var songUrl = "http://www.hjmin.com/song/url?id=";

//其中id为某个歌单的id，比如“我的喜欢”歌单，同样在分享链接中可以找到
// var playlistUrl = "https://api.imjad.cn/cloudmusic/?type=playlist&id=";

var isGetList = false;

//根据歌曲ID获取歌词的接口
var lyricApi = "http://www.hjmin.com/lyric?id=";

//进度条的颜色
var progressColors = ["#00ffff", "#FF5722", "#efff66", "#66ff71"];


//获取歌单的所有歌曲信息
function initSongs() {
    //通过ajax同步请求数据，如果网络异常则给出提示
    $.ajax({
        url: 'http://127.0.0.1:5000/songs',
        type: "get",
        dataType: 'JSON',
        async: false,
        cache: true,
        success: getSongId,
        error: function (xhr, status, error) {
            alert("抱歉，服务器故障了。");
        }
    });
}

//根据网易云接口返回的信息初始化歌曲列表
function getSongId(data) {
    // console.log(data);
    // var tracks = data.playlist.tracks;
    //刷新歌曲之前，先把之前的歌曲置空
    musicInfos = [];
    for (var i = 0; i < data.length; i++) {
        var obj = data[i].songs[0];
        var musicInfo = new Object();
        //只在第一个对象中存储歌单名称
        if (i == 0) {
            musicInfo.songListName = '';
        }
        musicInfo.songID = obj.id;
        musicInfo.songName = obj.name;
        //为了简洁，只获取第一个歌手的名
        musicInfo.artist = obj.ar[0].name;
        musicInfo.albumPic = obj.al.picUrl + '?param=270y270';
        musicInfo.totalTime = obj.dt;
        musicInfo.mp3Url = "http://music.163.com/song/media/outer/url?id=" + obj.id + ".mp3";
        musicInfo.mp3Url2 = ""; //第二个链接先置空，后面利用空闲时间异步获取，保证应用性能
        //connetTimes记录当前歌曲从接口获取mp3Url连接的次数，
        //超过5次则停止获取，
        //避免歌曲ID失效，网易云接口传过来的是空url，造成浪费资源多次获取
        musicInfo.connectTimes = 0;
        musicInfo.index = i;
        musicInfos.push(musicInfo);
    }

    //初始完成之后主要把赋值给正在播放的列表
    currentPlayList = musicInfos;
    currentPlayListIndex = 0;

    //现在有了新的解决mp3Url的方法，就是获取到歌曲ID后直接
    //在该链接后面加上ID的值http://music.163.com/song/media/outer/url?id= + id.mp3，
    //这为获取url链接提供了极大的方便，
    //既不用担心url链接失效，也不用担心获取url的接口失效或者IP被禁，
    //也避免了多次耗费资源循环地更新url链接

    //先同步获取第一首歌曲的第二个mp3Url2链接，
    //后面才异步获取当前播放歌曲的前10首和后10首。
    //由于网易云接口获取的url有时间限制，超过大概半个小时后url链接就会失效，
    //所以用户点击上一首或下一首共10次之后或者半个小时之后就会更新链接
    getMp3Url(musicInfos, 0, 1, 0, false);
}

//var errorCount = 0;
//initList当前需要获取url链接的数组，为musicInfos或者songSearchResults
function getMp3Url(initList, startindex, endIndex, goalIndex, isAsync, isCached) {

    for (var i = startindex; i < endIndex; i++) {
        // var songUrl = "";
        if (goalIndex) {
            songUrl = songUrl + initList[goalIndex].songID;
        } else {
            songUrl = songUrl + initList[i].songID;
        }
        // console.log(songUrl)
        $.ajax({
            url: songUrl,
            type: "get",
            dataType: 'JSON',
            crossDomain: true,
            async: isAsync,
            cache: isCached ? isCached : isAsync,
            success: function (data) {
                if (isAsync) {
                    var times = 0;
                    while (times < initList.length) {
                        //为防止异步加载数据顺序错乱，只有songID对应时才添加mp3Url链接
                        if (initList[startindex].songID != data.data[0].id) {
                            startindex = (startindex + 1) % initList.length;
                            times++;
                        } else {
                            initList[startindex].mp3Url2 = data.data[0].url;
                            startindex = (startindex + 1) % initList.length;
                            break;
                        }
                    }
                } else {
                    initList[goalIndex].mp3Url2 = data.data[0].url;
                }
            },
            error: function (xhr, status, error) {
                console.log(xhr.status);
                //errorCount++;
            }
        });
    }
}

function initDefaultSongList() {
    //通过ajax同步请求数据，如果网络异常则给出提示
    $.ajax({
        url: songList + songListName,
        type: "post",
        dataType: 'JSON',
        async: true,
        cache: true,
        success: initSongListData,
        error: function (xhr, status, error) {
            //alert("获取歌曲信息失败，请确认网络是否正常。");
        }
    });
}

function initSongListData(data) {
    if (data.result.playlistCount > 0) {
        var playlists = data.result.playlists;
        for (var i = 0; i < playlists.length; i++) {
            var list = new Object();
            if (i == 0) {
                list.userName = playlists[i].creator.nickname;
            }
            list.listID = playlists[i].id;
            list.listName = playlists[i].name;
            defaultSongList.push(list);
        }

        //将歌单信息传到songList.js中
        setTimeout(function () {
            window.frames[1].postMessage(defaultSongList, "/");
        }, 3000);
        //再把默认用户存入localStorage中，方便用户切换
        localStorage.setItem("userName0", "DefaultSongList");
    }
}

//当前播放器状态
var playStatus = {
    currentTrackLen: 0,
    currentTrackIndex: 0,
    currentTime: 0,
    currentTotalTime: 0,
    playTimes: 0, //点击上一首下一首的次数
    //使用下划线前缀表示这是受保护的对象，即protected
    _playStatus: false,
};

function initPlayStatus() {
    if (currentPlayList) {
        playStatus.currentTrackLen = currentPlayList.length;
    } else {
        playStatus.currentTrackLen = 0;
    }
    playStatus.currentTrackIndex = 0;
    playStatus.currentTime = 0;
    //因为timgTask会不断读取音乐的currentTime，
    //当点击本地文件夹音乐列表调用initPlayStatus()时,timgTask还会继续读取，
    //导致currentTime > currentTotalTime,误以为当前歌曲已经播放完成，
    //从而不断地播放一下首，导致bug
    playStatus.currentTotalTime = 10000000;
    playStatus.playTimes = 0;
    playStatus._playStatus = false;
}

var timeOut;

//启动定时任务，加载时间进度条和显示加载动画
function timingTask() {
    //因为interval会有累积效应，比如alert一个窗口，用户很久都还没点击，
    //这时线程因为alert而堵塞，但interval仍然会计算时间，
    //将到时间但还没执行的操作添加到队列中。
    //当用户点击后，累积的interval就会一次性按顺序执行，
    //此时一个clearInterval便无法把所有的interval停止了。
    //因此会造成性能问题。
    //因此时间间隔比较小的尽量使用内嵌setTimeOut来代替。
    //注意：setTimeOut也会累积
    playStatus.currentTime = $('#audio')[0].currentTime;
    playerControls.playTime();

    if (playStatus.currentTime >= playStatus.currentTotalTime) {
        $('.player .controls .next').click();
    }

    //根据网络状态显示加载动画
    //readyState == 0 表示have-nothing，还没开始加载资源
    //readyState == 2 表示已经有当前数据，但是还没有下面播放的数据
    //readyState == 4 表示已经有足够的数据
    //networkState == 2 表示请求网络资源正在加载中
    //networkState == 1 表示已经请求到网络资源，可以播放了
    if (($("#audio")[0].readyState != 4) &&
        $("#audio")[0].networkState != 1) {
        if ($(".loader:first").css("display") == "none") {
            $(".loader:first").css("display", "block");
        }
    } else {
        if ($(".loader:first").css("display") == "block") {
            $(".loader:first").css("display", "none");
        }
    }

    //如果playStatus为true则循环调用自己，
    //否则将自己停止
    if (playStatus.playStatus) {
        timeOut = setTimeout(timingTask, 300);
    } else {
        clearTimeout(timeOut);
        //如果加载动画还在加载，则停止加载
        if ($(".loader:first").css("display") == "block") {
            $(".loader:first").css("display", "none");
        }
        //刷新播放按钮状态
        $('.player .controls .play i').attr('class', 'icon-' + (playStatus.playStatus ? 'pause' : 'play'));
    }
}

//使用definedProperty方法监听playStatus属性，当为true的时候才进行定时任务
Object.defineProperty(playStatus, 'playStatus', {
    get: function () {
        return this._playStatus;
    },
    set: function (value) {
        this._playStatus = value;
        if (value == true) {
            //开启定时任务
            timingTask();
            // showFullLyric();
            // console.log($("lyricDiv")[0])
        } else {
            //按了停止键，则停止定时任务
            clearTimeout(timeOut);
            //如果加载动画还在加载，则停止加载
            if ($(".loader:first").css("display") == "block") {
                $(".loader:first").css("display", "none");
            }
            //刷新播放按钮状态
            $('.player .controls .play i').attr('class', 'icon-' + (playStatus.playStatus ? 'pause' : 'play'));
            // console.log('pause...')
        }
    }
});

var playerControls;
//重载刷新歌曲的次数，超过3次则停止刷新
var loadTimes = 0;

//歌曲链接失效的次数，如果超过3次则说明大部分的歌曲url已经失效，
//缓存已经失效，需要重新获取，刷新缓存
var invalidTimes = 0;

//初始化所有资源
var init;

$().ready(function () {
    //判断是否ios系统
    if (/ipad|iphone|mac/i.test(navigator.userAgent)) {
        $(".musicList").addClass('ios-scroll');
        $(".musicList iframe").addClass('frame');
        document.getElementById("view").setAttribute("content",
            "width=device-width,initial-scale=0.7, minimum-scale=0.7, maximum-scale=0.7, user-scalable=no");
    } else {
        $(".musicList iframe").css("height", "100%");
    }

    // drawStars();

    //根据localStorage初始化dataList元素，方便用户切换用户名
    // initDataList();

    //初始化所有音乐信息
    initSongs();

    // 渲染页面
    var id = musicInfos[playStatus.currentTrackIndex].songID;
    emotion(id);
    emoji(id);
    vip(id);
    age(id);
    comment_time(id);
    user_distribution(id);
    // $("#lyric").click();
    //播放器控制方法
    playerControls = {
        //歌曲基本信息
        trackInfo: function (args) {
            //保存现在正在播放的歌曲
            currentPlaySong = args;

            //先添加audio元素
            $('#audio').remove();
            $('.player').append('<audio id="audio" preload="auto"><source  id="source1" src=""><source id="source2" src=""></source></audio>');
            $('#source1').attr('src', args.mp3Url2);
            $('#source2').attr('src', args.mp3Url);

            //加载audio音频
            $("#audio")[0].load();

            if (args.isLocal) {
                //如果是本地文件夹的歌曲，则在audio音频元素加载完成时进行读取音频时长
                $("#audio")[0].onloadedmetadata = function () {
                    //音频时长单位为秒
                    var totalTime = $("#audio")[0].duration;
                    $('.player .time .total').text(timeConvert(totalTime));
                    playStatus.currentTotalTime = totalTime - 1;
                    args.totalTime = totalTime;
                }
            } else {
                //网易云接口返回的音频时长单位为毫秒
                //显示这首歌的时长，
                $('.player .time .total').text(timeConvert(args.totalTime / 1000));
                //减1是为了避免计算误差，无法自动下一首
                playStatus.currentTotalTime = Math.floor(args.totalTime / 1000) - 1;
            }

            //根据歌名长度设置字体大小，避免歌名太长超出边框
            $('.player .trackInfo .name p').text(args.songName);
            if (args.songName.length >= 40) {
                $('.player .trackInfo .name').css("font-size", "18px");
            } else if (args.songName.length > 30) {
                $('.player .trackInfo .name').css("font-size", "22px");
            } else {
                $('.player .trackInfo .name').css("font-size", "26px");
            }
            //歌手名称
            $('.player .trackInfo .artist').text(args.artist);
            //歌曲图片
            if (args.isLocal) {
                $('.player .albumPic').css('background', 'url(img/artist.jpg)');
            } else {
                $('.player .albumPic').css('background', 'url(' + args.albumPic + ')');
            }

            //获取歌词
            getLyric();
        },

        //播放、暂停状态处理
        playStatus: function () {
            $('.player .controls .play i').attr('class', 'icon-' + (playStatus.playStatus ? 'pause' : 'play'));

            if (playStatus.playStatus) {
                //networkState = 3则说明音乐mp3URl链接失效，找不到资源，需要重新获取歌曲url链接
                //networkState = 0则说明该音乐的mp3Url为空
                if ($("#audio")[0].networkState != 3 && $("#audio")[0].networkState != 0) {
                    console.log("readyState:" + $("#audio")[0].readyState);
                    console.log("networkState:" + $("#audio")[0].networkState);
                    console.log("error:" + $("#audio")[0].error);

                    $("#audio")[0].play();

                    //如果5秒后还是没有任何资源(reayState=0)而且网络仍然在加载(networkState=2)
                    //则重新加载刷新歌曲，重新加载次数不超过3次，仍然失败则是网络问题
                    setTimeout(function () {
                        console.log("readyState:" + $("#audio")[0].readyState);
                        console.log("networkState:" + $("#audio")[0].networkState);
                        console.log("error:" + $("#audio")[0].error);
                        if ($("#audio")[0].readyState == 0 &&
                            $("#audio")[0].networkState == 2) {
                            //重新刷新的歌曲信息
                            playerControls.trackInfo(currentPlaySong);
                            $("#audio")[0].load();
                            loadTimes++;
                            //playStatus.playStatus = false;
                            //先停顿0.1秒，让程序先加载音乐资源,否则networkState属性会为3，意为找不到资源
                            if (loadTimes <= 4) {
                                setTimeout(function () {
                                    playerControls.playStatus();
                                }, 300);
                            } else {
                                loadTimes = 0;
                                playStatus.playStatus = false;
                                alert("加载歌曲失败，请检查网络。");
                            }
                        } else if ($("#audio")[0].networkState == 3) {
                            //如果5秒后该音乐的网络状态为3，则说明请求资源失效
                            loadTimes = 0;
                            invalidTimes++; //歌曲失效次数增加，超过3次刷新url链接
                            playerControls.trackInfo(currentPlaySong);
                            $("#audio")[0].load();
                            //调用播放方法去刷新链接
                            playerControls.playStatus();
                        }
                    }, 5000);

                    //当点击下一首上一首的次数超过8次，对url进行更新
                    //因为指定了ajax使用cached，已经加载url的不用重新连接网易云接口
                    if (playStatus.playTimes >= 8 && currentPlayListIndex != 2) {
                        init20Songs();
                        playStatus.playTimes = 0;
                    }

                    //显示第一句歌词
                    if (lyricResult.length <= 0) {
                        $("#lyric").text("纯音乐，请欣赏。");
                    } else {
                        $("#lyric").text(lyricResult[0][1]);
                    }

                } else {
                    //先判断是否已经获取了3次
                    if (currentPlaySong.connectTimes < 3) {
                        //同步获取当前失效歌曲的url链接
                        if (currentPlayListIndex == 1) {
                            //如果是网络搜索结果则更新songSearchResults
                            getMp3Url(songSearchResults, 0, 1, playStatus.currentTrackIndex, false);
                            songSearchResults[currentPlaySong.index].connectTimes++;
                            playStatus.playStatus = false;
                            //重新加载失效的歌曲信息
                            playerControls.trackInfo(songSearchResults[currentPlaySong.index]);
                        } else if (currentPlayListIndex == 0) {
                            //否则更新musicInfos
                            getMp3Url(musicInfos, 0, 1, playStatus.currentTrackIndex, false);
                            musicInfos[playStatus.currentTrackIndex].connectTimes++;
                            playStatus.playStatus = false;
                            //重新加载失效的歌曲信息
                            playerControls.trackInfo(musicInfos[playStatus.currentTrackIndex]);
                        }
                        $("#audio")[0].load();
                        //先停顿0.1秒，让程序先加载音乐资源,否则networkState属性会为3，意为找不到资源
                        setTimeout(function () {
                            playerControls.playStatus();
                        }, 300);
                        alert("歌曲链接失效，请重新点击播放键。");
                    } else {
                        playStatus.playStatus = false;
                        alert("抱歉，该歌曲获取失败，请换下一首歌。");
                    }

                    //失效次数超过3次则说明缓存的url链接几乎都失效了，需要重新获取，刷新缓存
                    invalidTimes++;
                    if (invalidTimes >= 3 && currentPlayListIndex != 2) {
                        init20Songs(false, false);
                        invalidTimes = 0;
                    }
                }
            } else {
                if ($("#audio")[0].played) {
                    $('#audio')[0].pause();
                    //恢复歌词字样
                    if (lyricResult.length <= 0) {
                        if (playStatus.currentTrackIndex == 0) {
                            $("#lyric").text("歌词");
                        } else {
                            $("#lyric").text("纯音乐，请欣赏。");
                        }
                    } else {
                        $("#lyric").text("歌词");
                    }

                }
            }
        },

        //当前时间和进度处理
        playTime: function () {
            $('.player .time .current').text(timeConvert(playStatus.currentTime));
            $('.player .progress').css('width', playStatus.currentTime / playStatus.currentTotalTime * 100 + '%');
        }

    };

    var timeConvert = function (timestamp) {
        var minutes = Math.floor(timestamp / 60);
        var seconds = Math.floor(timestamp - (minutes * 60));

        if (seconds < 10) {
            seconds = '0' + seconds;
        }

        timestamp = minutes + ':' + seconds;
        return timestamp;
    };

    init = function () {
        //初始化播放状态
        initPlayStatus();

        if (musicInfos.length > 0) {
            playerControls.trackInfo(currentPlayList[playStatus.currentTrackIndex]);
            playerControls.playStatus();
        }

        $('.player .controls .play').unbind("click").click(function () {
            playStatus.playStatus = !playStatus.playStatus;
            playerControls.playStatus();
        });

        $('.player .controls .previous').unbind("click").click(function () {
            if (playStatus.currentTrackIndex - 1 < 0) {
                alert('已经没有上一首了');
                playStatus.currentTrackIndex = 0;
            } else {
                playStatus.currentTrackIndex--;
            }
            if (currentPlayListIndex != 2) {
                playerControls.trackInfo(currentPlayList[playStatus.currentTrackIndex]);

                //先停顿0.1秒，让程序先加载音乐资源,否则networkState属性会为3，意为找不到资源
                setTimeout(function () {
                    playerControls.playStatus();
                }, 300);
                $(".player .progress").css("background-image", "-webkit-linear-gradient(top, rgba(255, 255, 255, 0), " +
                    progressColors[playStatus.currentTrackIndex % 5] + ")");
                //点击下一首次数加1
                playStatus.playTimes++;
            } else {
                playLocalMusic(playStatus.currentTrackIndex);
            }
            var id = musicInfos[playStatus.currentTrackIndex].songID;
            emotion(id);
            emoji(id);
            vip(id);
            age(id);
            comment_time(id);
            user_distribution(id);
        });

        $('.player .controls .next').unbind("click").click(function () {

            if (playStatus.currentTrackIndex + 1 >= playStatus.currentTrackLen) {
                alert('已经没有下一首了');
                playStatus.currentTrackIndex = 0;
            } else {
                playStatus.currentTrackIndex++;
            }
            if (currentPlayListIndex != 2) {
                playerControls.trackInfo(currentPlayList[playStatus.currentTrackIndex]);
                //先停顿0.1秒，让程序先加载音乐资源,否则networkState属性会为3，意为找不到资源
                setTimeout(function () {
                    playerControls.playStatus();
                }, 300);
                $(".player .progress").css("background-image", "-webkit-linear-gradient(top, rgba(255, 255, 255, 0), " +
                    progressColors[playStatus.currentTrackIndex % 5] + ")");
                //点击上一首次数加1
                playStatus.playTimes++;
            } else {
                playLocalMusic(playStatus.currentTrackIndex);
            }
            var id = musicInfos[playStatus.currentTrackIndex].songID;
            emotion(id);
            emoji(id);
            vip(id);
            age(id);
            comment_time(id);
            user_distribution(id);
        });

    };

    init();
    //延迟5秒初始化20首歌链接，避免一开始加载时让用户觉得卡
    setTimeout(init20Songs, 5000);
    //然后再定时每30分钟更新一次url链接
    setInterval(init20Songs, 30 * 60 * 1000);
});

var frontLength = 10;
var behindLength = 10;
var startIndex = 0;
var endIndex = 0;
var time = null;
//异步加载当前歌曲的前10首后10首歌曲的链接，
//因为如果一次性循环访问网易云接口太多次会被503，
//或者会发生异域访问安全性问题，抛出No 'Access-Control-Allow-Origin' header 异常
//所以分两次进行异步加载
function init20Songs(secondFlag, isCached) {
    var currentIndex = playStatus.currentTrackIndex;

    var initList;
    switch (currentPlayListIndex) {
        //如果是初始的音乐歌曲列表
        case 0:
            initList = musicInfos;
            break;
        //如果是网络搜索结果列表
        case 1:
            initList = songSearchResults;
            break;
    }

    if (!secondFlag) {
        startIndex = (currentIndex - 10) >= 0 ? currentIndex - 10 : 0;
        getMp3Url(initList, startIndex, currentIndex, null, true, isCached);
    } else {
        endIndex = (currentIndex + 10) >= musicInfos.length ? musicInfos.length : currentIndex + 10;
        getMp3Url(initList, currentIndex, endIndex, null, true, isCached);
    }

    time = setTimeout(function () {
        init20Songs(true);
    }, 5000);

    if (time && secondFlag) {
        clearTimeout(time);
        setTimeout(checkMusicInfo, 5000);
    }

}

//检查20首歌曲的链接是否全都加载成功
function checkMusicInfo() {
    var urlNullCount = 0;
    var nullIndexs = [];
    for (var i = startIndex; i < endIndex; i++) {
        if (musicInfos[i].mp3Url2.length <= 0) {
            urlNullCount++;
            nullIndexs.push(i);
            // 				console.log("numIndex:"+i+",nullID: "+musicInfos[i].songID+","+musicInfos[i].songName);
        }
    }
    //console.log("urlNullCount:"+urlNullCount);
    //console.log("errorCount:"+errorCount);

    if (nullIndexs.length > 0) {
        getNullIDUrl(nullIndexs);
    }
}

//对空的url重新获取，避免死循环，最后只能获取3次
var currentTime = 0;

function getNullIDUrl(nullIndexs) {
    currentTime++;
    //判断是否进行了连接获取数据，为true才循环进行检查音乐信息
    var hasConnected = false;
    for (var i = 0; i < nullIndexs.length; i++) {
        //先判断该歌曲是否获取超过了5次
        var goalIndex = nullIndexs[i];
        if (musicInfos[goalIndex].connectTimes < 5) {
            //是以同步加载的方式获取
            getMp3Url(musicInfos, 0, 1, goalIndex, false);
            musicInfos[goalIndex].connectTimes++;
            hasConnected = true;
        }
    }
    if (currentTime < 3 && hasConnected) {
        setTimeout(checkMusicInfo, 5000);
    } else {
        //重置为0，下一轮循环也是3次
        currentTime = 0;
    }
}

function showList() {
    //通过iframe的postMessage方法将歌曲的信息musicInfos传送到music.js中进行显示
    //"/"表示传送信息的页面和接收的页面是同源的意思
    window.frames[0].postMessage(musicInfos, "/");
    listButtonShow(true);
    $("#songList").css("display", "none");
    $("#searchMusicList").css("display", "none");
}

//为了避免代码重复而整合的函数,
//当切换到歌曲列表页面，则把其他的元素隐藏，否则相反
function listButtonShow(isListShow) {
    var none = "";
    var block = "";
    if (isListShow) {
        none = "none";
        block = "block";
    } else {
        block = "none";
        none = "block";
    }

    $(".albumPic").css("display", none);
    $("#musicList").css("display", block);

    $("#musicBtn").css("display", none);
    $("#back").css("display", block);

    $("#switch").css("display", none);
    $("#local").css("display", block);

    $("#title").css("display", none);
    $("#search").css("display", block);
}

function goBack() {
    if ($("#searchMusicList").css("display") == "block") {
        if (currentPlayListIndex == 0) {
            $(".musicList").css("display", "none");
            $("#musicList").css("display", "block");
        } else if (currentPlayListIndex == 2) {
            $(".musicList").css("display", "none");
            $("#localMusicList").css("display", "block");
        }
    } else if ($("#netSearchList").css("display") == "block") {
        $(".musicList").css("display", "none");
        $("#musicList").css("display", "block");
    } else {
        listButtonShow(false);
        $("#songList").css("display", "none");
        $("#localMusicList").css("display", "none");
        $("#lyricDiv").css("display", "none");
    }
}

//切换歌单
function getSongList(userName) {

    if (userName.length > 0) {
        //显示加载动画
        $(".loader2").css("display", "block");

        //使用正则表达式和字符串的replace方法去掉前后的空格
        userName = userName.replace(/^\s+|\s+$/g, "");
        //console.log(userName.length);

        //如果输入的用户名为字符串，则说明是搜索该用户创建的所有歌单的
        //如果是数字，则说明输入的是歌单ID
        if (isNaN(userName)) {
            //通过ajax同步请求歌单数据，如果网络异常则给出提示
            $.ajax({
                url: songList + userName,
                type: "post",
                dataType: 'JSON',
                async: false,
                cache: true,
                success: showSongList,
                error: function (xhr, status, error) {
                    $(".loader2").css("display", "none");
                    alert("抱歉，服务器故障了，获取用户歌单失败。");
                }
            });
        } else {
            isGetList = true;
            showMusicList(userName, true);
        }

    }
}

//显示歌单列表
function showSongList(songList) {
    if (songList.result.playlistCount > 0) {
        isGetList = true;
        var playlists = songList.result.playlists;
        for (var i = 0; i < playlists.length; i++) {
            var list = new Object();
            if (i == 0) {
                list.userName = playlists[i].creator.nickname;
            }
            list.listID = playlists[i].id;
            list.listName = playlists[i].name;
            userSongList.push(list);
        }

        //加载完毕，关闭加载动画
        $(".loader2").css("display", "none");

        //将歌单信息传到songList.js中
        window.frames[1].postMessage(userSongList, "/");

        listButtonShow(true);
        $(".musicList").css("display", "none");
        $("#songList").css("display", "block");
        $("#title").css("display", "block");
        $("#search").css("display", "none");
        $("#local").css("display", "none");
    } else {
        isGetList = false;
        $(".loader2").css("display", "none");
        alert("抱歉，服务器故障了，获取用户歌单失败。");
    }
}

//自定义的弹出div窗口
function myPrompt(placeHolderName) {
    if (isGetList == false) {
        //jquery获取的元素是jquery对象,即使没有该元素也不会返回null,
        //所以以length是否为0判断div弹窗元素是否已经存在
        if ($("#msg").length != 0) {
            $("#msg").fadeIn(200);
        } else {
            $("body").append('<div id="msg">' +
                '<div id="msg_top">请输入您的网易云用户名：' +
                '<div class="cross"><span class="icon-cross"></span></div>' +
                '<br /> <span style="font-size:14px">（或者网易云歌单ID）</span>' +
                '</div>' +
                '<div id="msg_cont"><input id="userName" class="nameInput"  type="text" list="nameLists" placeholder="' + placeHolderName + '" /></div>' +
                '<div class="msg_confirm" id="confirm"><span class="icon-checkmark"></span></div>' +
                '</div>');
        }
        //如果使用jquery绑定事件的函数会被重复执行,则绑定的次数会叠加,
        //需要先解绑再添加,否则会重复执行多次      
        $("#userName").unbind("keypress").keypress(function (e) {
            if (e.keyCode == 13) {
                $("#confirm").click();
            }
        })

        $(".icon-cross").unbind("click").click(function () {
            $("#msg").fadeOut(200);
        });

        $("#confirm").unbind("click").click(function () {
            if ($("#userName").val().length > 0) {
                $("#msg").css("display", "none");
                getSongList($("#userName").val());
                //将用户名永久保存到浏览器中的localStorage中,方便后面输入
                if (nameLists.search($("#userName").val()) == -1) {
                    var key = "userName" + (localStorage.length + 1);
                    localStorage.setItem(key, $("#userName").val());
                }
            } else {
                alert("请输入您的网易云用户名");
            }
        });
    } else {
        listButtonShow(true);
        $(".musicList").css("display", "none");
        $("#songList").css("display", "block");
        $("#title").css("display", "block");
        $("#search").css("display", "none");
        $("#local").css("display", "none");
    }

}

//点击歌单或者输入歌单ID显示歌曲列表
function showMusicList(listID, isUserInput) {
    $(".loader2").css("display", "block");
    var url = playlistUrl + listID;
    initSongs(url);
    //init();
    showList();
    setTimeout(init20Songs, 5000);
    $(".loader2").css("display", "none");
    //如果是用户直接输入歌单ID的,还需要把歌单的信息传送到songList页面中
    if (isUserInput) {
        //将歌单信息传到songList.js中
        var inputSongList = [];
        var songList = new Object();
        songList.userName = "Admin";
        songList.listID = listID;
        songList.listName = musicInfos[0].songListName;
        inputSongList.push(songList);
        window.frames[1].postMessage(inputSongList, "/");
    }
}

//添加消息监听,监听iframe页面传送过来的信息,即用户点的是第几首歌曲
window.addEventListener("message", function (e) {

    //通过信息的来源判断是哪个frame传过来的
    if (e.source == window.frames[0]) {
        //alert("这是从音乐列表传过来的信息");
        if (e.data == "switchSongList") {
            listButtonShow(true);
            $(".musicList").css("display", "none");
            $("#songList").css("display", "block");
            $("#title").css("display", "block");
            $("#search").css("display", "none");
        } else {
            //将当前播放列表指向musicInfos
            currentPlayList = musicInfos;
            //当前播放列表的表示符为0
            currentPlayListIndex = 0;
            playCurrentMusic(e.data)
        }
    } else if (e.source == window.frames[1]) {
        //alert("这是从歌单列表传过来的信息");
        if (e.data == "switchUser") {
            isGetList = false;
            userSongList = [];
            myPrompt("绿水青山jv");
        } else {
            var listID = e.data;
            showMusicList(listID);
        }
    } else if (e.source == window.frames[2]) {
        //alert("这是从本地搜索列表传过来的信息");
        if (currentPlayListIndex != 2) {
            playCurrentMusic(e.data);
        } else {
            playLocalMusic(e.data);
        }
    } else if (e.source == window.frames[3]) {
        //alert("这是从网络搜索列表传过来的信息");
        //将当前播放列表指向songSearchResults
        currentPlayList = songSearchResults;
        //当前播放列表的标识符为1
        currentPlayListIndex = 1;
        playCurrentMusic(e.data);
    } else if (e.source == window.frames[4]) {
        //alert("这是从本地文件夹音乐列表传过来的信息")
        if (e.data == "switchLocalList") {
            getLocalFiles();
        } else {
            currentPlayList = localMusicFiles;
            currentPlayListIndex = 2;
            playLocalMusic(e.data);
        }
    }
}, false);

//本地音乐播放还需要额外处理,将本地音乐文件转化成可以播放的二进制音频
function playLocalMusic(currentTrackIndex) {
    //初始化一下播放状态,指向当前播放列表
    initPlayStatus();
    if (localMusicFiles[currentTrackIndex].mp3Url.length <= 0) {
        var localMusic = localMusicFiles[currentTrackIndex];
        var musicFiles = localMusic.musicData;
        var fileReader = new FileReader();
        //监听本地音乐读取事件
        fileReader.onload = function (e) {
            localMusic.mp3Url = e.target.result;
            //如果读取完成则进行播放
            playStatus.currentTrackIndex = currentTrackIndex;
            playerControls.trackInfo(currentPlayList[playStatus.currentTrackIndex]);
            playStatus.playStatus = true;
            setTimeout(function () {
                playerControls.playStatus();
            }, 1000);
        }
        //将本地音乐文件以url的二进制音频形式进行读取
        fileReader.readAsDataURL(musicFiles);
    } else {
        //如果已经保存了mp3Url信息,则直接播放
        playStatus.currentTrackIndex = currentTrackIndex;
        playerControls.trackInfo(currentPlayList[playStatus.currentTrackIndex]);
        playStatus.playStatus = true;
        setTimeout(function () {
            playerControls.playStatus();
        }, 500);
    }
}

function playCurrentMusic(currentTrackIndex) {
    //初始化一下播放状态,指向当前播放列表
    initPlayStatus();
    playStatus.currentTrackIndex = currentTrackIndex;
    playerControls.trackInfo(currentPlayList[playStatus.currentTrackIndex]);
    playStatus.playStatus = true;
    //如果点击的音乐url链接为空,则进行获取
    if (currentPlayList[playStatus.currentTrackIndex].mp3Url2.length <= 0) {
        getMp3Url(currentPlayList, 0, 1, playStatus.currentTrackIndex, false, false);
        //如果前后的音乐url链接都是为空则获取前后10音乐的链接
        if (currentPlayList[(playStatus.currentTrackIndex + 1) % currentPlayList.length].mp3Url2.length <= 0 ||
            currentPlayList[(playStatus.currentTrackIndex - 1) % currentPlayList.length].mp3Url2.length <= 0) {
            setTimeout(init20Songs, 5000);
        }
    }
    setTimeout(function () {
        playerControls.playStatus();
    }, 300);
}

//快捷键
$("html").unbind("keydown").keydown(function (e) {

    //播放快捷键 空格
    //事件会冒泡,只有nodeName为body或者html才出发,否则input框按下空格键也会触发
    if ((e.target.nodeName == "BODY" || e.target.nodeName == "HTML") && e.keyCode == 32) {
        $('.player .controls .play').click();
    }

    //下一首快捷键 Ctrl + Alt + ->
    if (e.ctrlKey && e.altKey && e.keyCode == 39) {
        $('.player .controls .next').click();
    }

    //上一首快捷键,Ctrl + Alt + <-
    if (e.ctrlKey && e.altKey && e.keyCode == 37) {
        $('.player .controls .previous').click();
    }
});

//保存所有用户名,如果用户名已存在则无需添加
var nameLists = "";

//从localStorage获取数据初始化dataList
function initDataList() {
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.search("userName") != -1) {
            var value = localStorage.getItem(key);
            //只对还没有添加的用户名进行添加
            if (nameLists.search(value) == -1) {
                $("#nameLists").append('<option label="' + value + '" value="' + value + '"></option>');
                nameLists += value;
            }
        }
    }
}


(function () {
    //因为要更改setItem方法,所以先把原方法保存
    var originalSetItem = localStorage.setItem;

    //更改setItem方法
    localStorage.setItem = function (key, value) {
        //生成一个自定义事件
        var setItemEvent = new Event("setItemEvent");
        setItemEvent.value = value;
        //抛出触发事件
        window.dispatchEvent(setItemEvent);
        //最后再执行原来方法的操作
        originalSetItem.apply(this, arguments);
    }

    //这样就实现了当调用localStorage.setItem()方法时,把用户名添加到datalist元素中
    window.addEventListener("setItemEvent", function (e) {
        if (nameLists.search(e.value) == -1) {
            $("#nameLists").append('<option label="' + e.value + '" value="' + e.value + '"></option>');
            nameLists += e.value;
        }
    })
})();

//保存搜索的歌曲名,如果歌曲名已存在则无需添加
var songNameLists = "";

//搜索歌曲
function promptSearch() {

    if ($("#searchDiv").length != 0) {
        $("#searchDiv").fadeIn(200);
    } else {
        $("body").append('<div id="searchDiv">' +
            '<div class="search_top">请输入歌名：' +
            '<div class="cross"><span class="icon-cross2"></span></div></div>' +
            '<div class="search_cont"><input id="songName" class="songInput"  type="text" list="songLists" /></div>' +
            '<div class="search_confirm" ><button class="localSearch" id="localSearch">本地搜索</button>' +
            '<button class="netSearch" id="netSearch">网络搜索</button></div>' +
            '</div>');
    }

    //如果使用jquery绑定事件的函数会被重复执行,则绑定的次数会叠加,
    //需要先解绑再添加,否则会重复执行多次      
    $("#songName").unbind("keypress").keypress(function (e) {
        if (e.keyCode == 13) {
            $("#localSearch").click();
        }
    })

    $(".icon-cross2").unbind("click").click(function () {
        $("#searchDiv").fadeOut(200);
    });

    $("#localSearch").unbind("click").click(function () {
        if ($("#songName").val().length > 0) {
            $("#searchDiv").fadeOut(200);
            localSearch($("#songName").val());

            //将歌曲保存到浏览器中的sessionStorage中,方便后面输入
            if (songNameLists.search($("#songName").val()) == -1) {
                //				var key = "userName" + localStorage.length;
                //				localStorage.setItem(key, $("#userName").val());
            }
        } else {
            alert("请输入歌名");
        }
    });

    $("#netSearch").unbind("click").click(function () {
        if ($("#songName").val().length > 0) {
            $("#searchDiv").fadeOut(200);
            netSearch($("#songName").val());

            //将歌曲保存到浏览器中的sessionStorage中,方便后面输入
            if (songNameLists.search($("#userName").val()) == -1) {
                //				var key = "userName" + localStorage.length;
                //				localStorage.setItem(key, $("#userName").val());
            }
        } else {
            alert("请输入歌名");
        }
    });
}

function localSearch(songName) {
    var results = [];
    for (var i = 0; i < currentPlayList.length; i++) {
        songName = songName.toLowerCase().trim();
        musicInfoName = currentPlayList[i].songName.toLowerCase().trim();
        if (musicInfoName.indexOf(songName) >= 0) {
            results.push(currentPlayList[i]);
        }
    }

    if (results.length > 0) {
        //console.log("找到歌曲:"+results[0].index+","+results[0].songID+","+results[0].songName);
        //把搜索结果传送到搜索页面
        window.frames[2].postMessage(results, "/");
        $("#searchDiv").fadeOut(200);
        $(".musicList").css("display", "none");
        $("#netSearchList").css("display", "none");
        $("#searchMusicList").css("display", "block");
    } else {
        alert("找不到本地歌曲");
        $("#searchDiv").fadeIn(0);
    }

}

function netSearch(songName) {
    var searchUrl = songSearch + songName;
    $.ajax({
        url: searchUrl,
        type: 'get',
        dataType: 'json',
        async: false,
        cache: true,
        success: showSearchHtml,
        error: function (xhr, status, error) {
            alert("抱歉,搜索失败,服务器出故障了.")
        }
    })

}

function showSearchHtml(results) {
    var songs = results.result.songs;
    //把之前的搜索结果置空
    songSearchResults = [];
    for (var i = 0; i < songs.length; i++) {
        var song = new Object();

        song.songID = songs[i].id;
        song.songName = songs[i].name;
        //为了简洁，只获取第一个歌手的名
        song.artist = songs[i].ar[0].name;
        song.albumPic = songs[i].al.picUrl + '?param=270y270';
        song.totalTime = songs[i].dt;
        song.mp3Url = "http://music.163.com/song/media/outer/url?id=" + songs[i].id + ".mp3";
        song.mp3Url2 = "";
        //connetTimes记录当前歌曲从接口获取mp3Url连接的次数，
        //超过5次则停止获取，
        //避免歌曲ID失效，网易云接口传过来的是空url，造成浪费资源多次获取
        song.connectTimes = 0;
        song.playTimes = 0;
        song.index = i;
        song.isSearch = true;

        songSearchResults.push(song);
    }

    //初始化网络搜索到歌曲的链接
    setTimeout(function () {
        init20Songs(false, true, true);
    }, 5000);
    //把搜索结果传送到搜索页面
    window.frames[3].postMessage(songSearchResults, "/");
    $("#searchDiv").fadeOut(200);
    $("#musicList").css("display", "none");
    $("#searchMusicList").css("display", "none");
    $("#netSearchList").css("display", "block");
}

function getLocalFiles() {
    //如果本地音乐列表不存在,则进行选择音乐文件
    if (localMusicFiles.length <= 0 || $("#localMusicList").css("display") == "block") {
        if ($("#localMusic").length != 0) {
            $("#localMusic").fadeIn(200);
        } else {
            $("body").append('<div id="localMusic">' +
                '<div id="music_top">请选择您的音乐文件：' +
                '<div class="music_cross"><span class="icon-cross3"></span></div>' +
                '<br /> <span style="font-size:14px">（可以一次性选多首音乐）</span>' +
                '</div>' +
                '<div id="music_cont"><input id="musicFiles" class="musicInput"  type="file" accept="audio/*" multiple/></div>' +
                '<div class="music_confirm" id="music_confirm"><span class="icon-checkmark"></span></div>' +
                '</div>');
        }

        $(".icon-cross3").unbind("click").click(function () {
            $("#localMusic").fadeOut(200);
        });

        $("#music_confirm").unbind("click").click(function () {
            var musicFiles = document.getElementById("musicFiles");
            //value属性保存的是文件的绝对路径,如果为空则说明没有选到文件
            if (musicFiles.value) {
                $("#localMusic").fadeOut(200);
                var files = musicFiles.files;
                var hasNotEmpty = true;
                var isMp3 = false;

                for (var i = 0; i < files.length; i++) {
                    //如果选择的文件是音频文件才进行添加
                    if (/audio\/\w+/g.test(files[i].type)) {

                        //存在音频文件才把上次选择的本地音乐清空,再进行添加
                        if (hasNotEmpty) {
                            localMusicFiles = [];
                            hasNotEmpty = false;
                            isMp3 = true;
                        }

                        var musicInfo = new Object();

                        musicInfo.songID = -1;
                        musicInfo.songName = files[i].name;
                        musicInfo.artist = "本地歌曲";
                        musicInfo.albumPic = "";
                        //本地歌曲时长时间还需要获取数据处理
                        musicInfo.totalTime = 210000;
                        musicInfo.mp3Url = "";
                        musicInfo.mp3Url2 = "";
                        musicInfo.connectTimes = 0;
                        musicInfo.index = i;
                        //先将本地音乐文件的files对象保存,等到用户点击歌曲的时候才进行加载播放
                        musicInfo.musicData = files[i];
                        //标志该歌曲是本地歌曲
                        musicInfo.isLocal = true;
                        localMusicFiles.push(musicInfo);
                    }
                }

                //如果选择的所有文件都不是音频文件则进行提醒
                if (!isMp3) {
                    alert("请选择音频文件");
                    $("#localMusic").fadeIn(0);
                } else {
                    //将本地音乐数据传送到本地音乐列表页面
                    window.frames[4].postMessage(localMusicFiles, "/");
                    $("#musicList").css("display", "none");
                    $("#songList").css("display", "none");
                    $("#searchMusicList").css("display", "none");
                    $("#netSearchList").css("display", "none");
                    $("#localMusicList").css("display", "block");
                }
            } else {
                alert("请选择音乐文件");
            }
        });
    } else {
        //如果本地音乐文件列表已经存在,则直接显示出来
        listButtonShow(true);
        $(".musicList").css("display", "none");
        $("#title").css("display", "none");
        $("#search").css("display", "block");
        $("#local").css("display", "block");
        $("#localMusicList").css("display", "block");
    }
}

//调用trackInfo方法加载音乐信息的时候,也进行加载歌词,并进行解析
function getLyric() {
    if (currentPlaySong.isLocal) {
        //如果是本地音乐,则把歌词隐藏
        $(".lyric").css("display", "none");
    } else {
        //如果是网络音乐,则把歌词显示
        $(".lyric").css("display", "block");
        //通过ajax异步获取歌词信息，如果网络异常则给出提示
        $.ajax({
            url: lyricApi + currentPlaySong.songID,
            type: "get",
            dataType: 'JSON',
            async: true,
            cache: true,
            success: processLyric,
            error: function (xhr, status, error) {
                alert("抱歉,获取歌词失败，服务器出故障了。");
            }
        });
    }
}

//解析歌词
function processLyric(lyricData) {
    //正则表达式,匹配[00:59.40]这是时间格式
    var pattern = /\[\d{2}:\d{2}.\d+\]/g;

    //如果标志没有歌词或者歌词内容不匹配时间格式,则归为纯音乐
    if (lyricData.nolyric == true || !pattern.test(lyricData.lrc.lyric)) {
        lyricResult = [];
        lyricArtistMessage = [];
        $("#lyricDiv").empty();
        $("#lyricDiv").append("<ul><li>纯音乐,请欣赏。</li></ul>")
        $("#lyric").text("纯音乐，请欣赏。");
        return;
    }

    var lyricInfo = lyricData.lrc.lyric;
    var lines = lyricInfo.split("\n");

    //用来存储解析出来的歌词,格式如下[[time,lyricString],[time,lyricString],.....]
    lyricResult = [];
    lyricArtistMessage = [];

    //有一些歌词前面时歌手的介绍,没有歌词的,需要把它去掉
    //直到匹配到有时间的歌词才会停止循环
    var artistPattern = /\[\w+:/g;

    //需要注意,正则表达式使用g模式的话,下一次匹配会从lastIndex开始匹配,
    //因为上面使用了pattern进行了匹配,有可能lastIndex不为0,所以需要重置为0

    pattern.lastIndex = 0;

    while (!pattern.test(lines[0])) {
        //先把歌手信息保存下来,因为全屏歌词的时候需要显示
        var lyricMessage = lines[0].replace(artistPattern, "").slice(0, -1);
        lyricMessage.length > 0 ? lyricArtistMessage.push(lyricMessage) : 0;

        //去掉第一个元素并返回剩下元素
        lines = lines.splice(1);
    }

    //lines最后一行是空的话把它去除掉
    lines[lines.length - 1].length == 0 && lines.pop();

    lines.forEach(function (value, index, array) {
        //返回匹配的时间
        var time = value.match(pattern);
        //将时间置换成空格,返回歌词字符串内容
        var lyricString = value.replace(pattern, "");
        //由于一行歌词会有多个时间, 如[03:33.65][03:35.39],所以需要进一步分离
        time.forEach(function (value2, index2, array2) {
            //去掉前后的[]
            var t = value2.slice(1, -1).split(":");
            //用秒数表示当前歌词的时间
            var seconds = parseInt(t[0]) * 60 + parseFloat(t[1]);
            //将时间和歌词以数组的形式压进lyriclyricResult中
            lyricResult.push([seconds, lyricString]);
        });
    });

    //将结果按照时间排序,保证歌词正确有序输出
    lyricResult.sort(function (a, b) {
        //如果想要a在b前面,则返回一个负数,否则a想排在b后面,则返回一个正数
        //所以想要元素按照升序排序,则返回a与b的差值就行
        return a[0] - b[0];
    });

    addLyric();
    //把歌词位置置为初始化
    lyricIndex = 1;
    showLyric();
}

function addLyric() {
    $("#lyricDiv").empty();
    var ul = $("<ul></ul>");
    //歌手信息
    for (var i = 0; i < lyricArtistMessage.length; i++) {
        ul.append("<li>" + lyricArtistMessage[i] + "</li>")
    }
    //歌词信息
    for (var i = 0; i < lyricResult.length; i++) {
        ul.append("<li>" + lyricResult[i][1] + "</li>")
    }
    $("#lyricDiv").append(ul);
}

//监听audio的timeUpdate事件,
//第一句歌词会在点击播放按钮时显示出来,
//如果当前时间已经大于第一句歌词的时间,则说明第一句唱完了,
//则把第一句隐藏,更改歌词内容,显示第二句歌词.
//再把当前时间跟第三句歌词时间进行比较,依次循环.

var lyricIndex = 1; //记录当前是第几条歌词
function showLyric() {

    //因为歌词头部还有歌手信息,因此高亮的歌词从j开始
    var j = lyricArtistMessage.length;
    $("#lyricDiv ul li").get(j).style.color = "#ff6666";

    //检测第第三句歌词,如果是中文,则歌词大小改为18px
    if (lyricResult.length > 3) {
        for (var i = 0; i < lyricResult[2][1].length; i++) {
            //因为歌词英文的分号为’,所以也要排除这个
            if (lyricResult[2][1].charCodeAt(i) > 127 && lyricResult[2][1].charAt(i) != '’') {
                $("#lyricDiv ul").css("font-size", "19px");
                $("#lyric").css("font-size", "19px");
            }
        }
    }

    $("#audio")[0].ontimeupdate = function (e) {

        if (lyricResult.length > 0 && this.currentTime > lyricResult[lyricIndex][0]) {
            //如果大屏歌词没有打开,则小框进行显示
            if ($("#lyricDiv").css("display") == "none") {
                $("#lyric").fadeOut(0);
                $("#lyric").text(lyricResult[lyricIndex][1]);
                $("#lyric").fadeIn();
            } else {
                $("#lyric").text("歌词");

                //把上一条歌词颜色进行恢复
                $("#lyricDiv ul li").css("color", "#cbc7c7");
                //把现在这条歌词高亮显示
                $("#lyricDiv ul li").get(lyricIndex + j).style.color = "#ff6666";

                //初始歌词的高度是80,所以将80-叠加的高度则得出歌词需要滑动的高度
                $("#lyricDiv ul").animate({
                    "top": 80 - lyricHeight[lyricIndex - 1] + "px"
                }, 1000);
            }

            //把歌词的索引移到下一条
            lyricIndex++;
        }
    }
}

function showFullLyric() {
    $("#lyricDiv").css("display", "block");

    //把所有歌词的高度保存,因为设为none之后该值也会丢失
    //为了方面后面设置高度,保存的值是叠加高度的值
    lyricHeight = [];
    for (var i = 0; i < $("#lyricDiv ul li").length; i++) {
        var last = i == 0 ? 0 : lyricHeight[i - 1];
        lyricHeight.push(last + $("#lyricDiv ul li")[i].offsetHeight);
    }

    $("#lyric").text("歌词");
    $("#lyric").attr("style", "padding-top: 200px");

    //迅速滑到当前播放的歌词
    //初始歌词的高度是80,所以将80-叠加的高度则得出歌词需要滑动的高度
    if (lyricIndex >= 2) {
        $("#lyricDiv ul").animate({
            "top": 80 - lyricHeight[lyricIndex - 1] + "px"
        }, 1000);
    }
}
