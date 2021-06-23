from multiprocessing import Process
from bs4 import BeautifulSoup
import requests
from tqdm import tqdm
import time
from datetime import datetime, date
import random
import config
import pymongo
import gc
from gevent import monkey

monkey.patch_socket()
import gevent


class NeteaseSpider:
    def __init__(self):
        self.headers = config.headers
        self.cookies = config.cookies
        self.vip = {0: '普通', 10: '音乐包', 11: '黑胶会员'}
        self.gender = {0: '未知', 1: '男', 2: '女'}
        self.loc = self.get_loccodes()
        self.client = pymongo.MongoClient(config.mongodb_url)
        self.db = self.client[config.db_name]
        self.mongodb = self.db[config.col]

    # 获取地区代码
    def get_loccodes(self):
        # 行政区划代码
        url = 'http://www.mca.gov.cn/article/sj/xzqh/2018/201804-12/20180810101641.html'
        locs = {}
        try:
            r = requests.get(url)
            if r.status_code == 200:
                r.encoding = "utf-8"
                soup = BeautifulSoup(r.text, 'html5lib')
                items = soup.find_all('tr', attrs={"height": "19"})
                for item in items:
                    # print(item.find_all('td')[1].text, item.find_all('td')[2].text)
                    locs[int(item.find_all('td')[1].text)] = item.find_all('td')[2].text
        except:
            print("获取省份代码失败！")
            exit(-1)
        return locs

    # 获取地区
    def get_locate(self, p, c):
        try:
            locate = self.loc[p] + self.loc[c]
            return locate
        except:
            return '云村'

    # 获取歌单详情（歌单中的音乐）
    def get_songs(self, playlist_id):
        url = 'http://music.163.com/api/playlist/detail'
        payload = {'id': playlist_id}
        r = requests.get(url, params=payload, headers=self.headers,
                         cookies=self.cookies)
        playlist_detail = r.json()['result']['tracks']
        songs = []
        for song_detail in playlist_detail:
            song = dict()
            song['id'] = song_detail['id']
            song['name'] = song_detail['name']
            artists_detail = []
            for artist in song_detail['artists']:
                artist_detail = dict()
                artist_detail['name'] = artist['name']
                artist_detail['id'] = artist['id']
                artists_detail.append(artist_detail)
            song['artists'] = artists_detail
            songs.append(song)
            del song
            gc.collect()
        return songs

    # 获取歌词
    def get_lyric(self, song_id):
        url = 'http://music.163.com/api/song/lyric'
        payload = {
            'os': 'pc',  # osx
            'id': song_id,
            'lv': -1,
            'kv': -1,
            'tv': -1
        }
        r = requests.get(url, params=payload, headers=self.headers,
                         cookies=self.cookies)
        result = r.json()
        if ('nolyric' in result) or ('uncollected' in result):
            return None
        elif 'lyric' not in result['lrc']:
            return None
        else:
            return result['lrc']['lyric']

    # 获取评论
    def get_song_comments(self, song_id, offset=0, total='false', limit=100):
        url = ('http://music.163.com/api/v1/resource/comments/R_SO_4_{}/'
               ''.format(song_id))
        payload = {
            'rid': 'R_SO_4_{}'.format(song_id),
            'offset': offset,
            'total': total,
            'limit': limit
        }
        r = requests.get(url, params=payload, headers=self.headers,
                         cookies=self.cookies)
        return r.json()

    # 获取评论
    def get_comments(self, song_id):
        comments = self.get_song_comments(song_id)['comments']
        comments_list = []
        offset = 0
        i = 0
        while comments:
            i += 1
            for comment in tqdm(comments, desc='当前音乐进度({}/20): '.format(i), ncols=80):
                comment_detail = dict()
                user_info = dict()
                try:
                    user = self.get_user_detail(comment['user']['userId'])
                    user_info['user_id'] = comment['user']['userId']
                    user_info['level'] = user['level']
                    user_info['nickname'] = user['profile']['nickname']
                    user_info['listen_songs'] = user['listenSongs']
                    user_info['vip'] = self.vip[user['profile']['vipType']]
                    user_info['create_days'] = user['createDays']
                    user_info['birthday'] = user['profile']['birthday']
                    if user['profile']['birthday'] > 0:
                        user_info['age'] = date.today().year - \
                                           datetime.fromtimestamp(user['profile']['birthday'] // 1000).year
                    else:
                        user_info['age'] = 0
                    user_info['gender'] = self.gender[user['profile']['gender']]
                    user_info['province'] = user['profile']['province']
                    user_info['city'] = user['profile']['city']
                    user_info['locate'] = self.get_locate(user['profile']['province'], user['profile']['city'])
                except:
                    pass
                comment_detail['content'] = comment['content']
                comment_detail['time'] = comment['time']
                comment_detail['user'] = user_info
                comments_list.append(comment_detail)
                # print(comment_detail)
                del user_info, user, comment_detail
                gc.collect()
                # time.sleep(random.uniform(1, 2))
            # 2000 条停止
            if i == 20:
                break
            offset = offset + 100
            comments = self.get_song_comments(song_id,
                                              offset=offset)['comments']
        return comments_list

    # 获取用户信息
    def get_user_detail(self, user_id):
        url = 'http://music.163.com/api/v1/user/detail/{}'.format(user_id)
        r = requests.get(url, headers=self.headers, cookies=self.cookies)
        # print(r.json())
        return r.json()

    def start(self, playlist):
        for i in tqdm(playlist, desc='总进度：', ncols=80):
            for song in tqdm(self.get_songs(i['id']), desc='当前歌单进度：', ncols=80):
                try:
                    info = dict()
                    info['song_id'] = song['id']
                    info['name'] = song['name']
                    info['artists'] = [j['name'] for j in song['artists']]
                    info['lyric'] = self.get_lyric(song['id'])
                    info['comments'] = self.get_comments(song['id'])
                    self.mongodb.insert_one(info)
                    del info
                    gc.collect()
                except Exception as e:
                    print(e)
                    requests.post(url='https://qmsg.zendee.cn/send/{0}'.
                                  format('5cfbbbe7c89d86846cab9623ef0918ec'),
                                  data={'msg': e, 'qq': '2451809588'})

    def run(self, playlist):
        n = len(playlist)
        # 多协程执行
        jobs = [
            gevent.spawn(self.start, playlist[: n // 5]),
            gevent.spawn(self.start, playlist[n // 5: (n // 5) * 2]),
            gevent.spawn(self.start, playlist[(n // 5) * 2: (n // 5) * 3]),
            gevent.spawn(self.start, playlist[(n // 5) * 3: (n // 5) * 4]),
            gevent.spawn(self.start, playlist[(n // 5) * 4:])
        ]
        gevent.joinall(jobs)


# 获取歌单
def get_playlist():
    playlist_url = 'http://musicapi.leanapp.cn/top/playlist?limit=300&order=new&cat=%E6%B0%91%E8%B0%A3'
    return requests.get(playlist_url).json()['playlists']


def run(pl, i):
    print('start...', i)
    spider = NeteaseSpider()
    spider.run(pl)


if __name__ == '__main__':
    playlist = get_playlist()
    begin = 0
    end = 20
    step = 20
    for _ in range(5):
        p = Process(target=run, args=(playlist[begin:end], _))
        p.start()
        begin = end
        end += step
    print('Done!')
