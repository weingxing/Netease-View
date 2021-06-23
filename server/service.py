import re
import time
from server import dao
import jieba
import requests
import pickle as pkl
import jiagu
from collections import Counter


def get_loccodes():
    with open('../data/loccodes.pkl', 'rb') as f:
        locs = pkl.load(f)
    return locs


def get_locate(address):
    try:
        with open('../data/geo.pkl', 'rb') as f:
            geo = pkl.load(f)
        return geo[address]
    except:
        return []


def emoji_count(song_id):
    res = dao.find_by_id(song_id)
    _comments = []
    for j in res['comments']:
        _comments.append(j['content'])
    emoji_list = []
    for li in _comments:
        emojis = re.findall(re.compile(u'(\[.*?\])', re.S), li)
        if emojis:
            for emoji in emojis:
                emoji_list.append(emoji)
    emoji_dict = Counter(emoji_list)
    res = dict()
    for i in emoji_dict.most_common(20):
        res[i[0]] = i[1]
    return res


def user_age(song_id):
    res = dao.find_by_id(song_id)
    _users = []
    for i in res['comments']:
        try:
            _users.append(i['user'])
        except:
            pass
    result = {'未知': 0, '0-18': 0, '18-28': 0, '28-40': 0, '40-55': 0, '55以上': 0}
    # print(_users)
    for user in _users:
        try:
            if user['age'] == 0:
                result['未知'] += 1
            elif 0 < user['age'] <= 18:
                result['0-18'] += 1
            elif 18 < user['age'] <= 28:
                result['18-28'] += 1
            elif 28 < user['age'] <= 40:
                result['28-40'] += 1
            elif 40 < user['age'] <= 55:
                result['40-55'] += 1
            else:
                result['55以上'] += 1
        except:
            pass
    return result


def user_city(song_id):
    res = dao.find_by_id(song_id)
    _users = []
    for i in res['comments']:
        try:
            _users.append(i['user'])
        except:
            pass
    code = get_loccodes()
    locates = []
    for user in _users:
        try:
            locates.append(code[user['city']])
        except:
            pass
    result = []
    geo = dict()
    tmp = dict(Counter(locates))
    for i in tmp.keys():
        geo[i] = (get_locate(i))
        result.append({'name': i, 'value': tmp[i]})
    return {'data': result, 'geo': geo}


def user_vip(song_id):
    res = dao.find_by_id(song_id)
    vip = []
    for i in res['comments']:
        try:
            vip.append(i['user']['vip'])
        except:
            pass
    result = []
    tmp = dict(Counter(vip))
    for i in tmp.keys():
        result.append({'name': i, 'value': tmp[i]})
    return result


def random_song(size):
    _songs = dao.random_find(size)
    result = []
    for song in _songs:
        r = requests.get('http://www.hjmin.com/song/detail?ids=' + str(song['song_id']))
        result.append(r.json())
    return result


# 分词
def word_segmentation(content, stop_words):
    # 使用 jieba 分词对文本进行分词处理
    # jieba.enable_parallel()
    seg_list = jieba.cut(content, cut_all=False)
    seg_list = list(seg_list)
    # 去除停用词
    word_list = []
    for word in seg_list:
        if word not in stop_words:
            word_list.append(word)
    # 过滤遗漏词、空格
    user_dict = [' ', '哒']
    filter_space = lambda w: w not in user_dict
    word_list = list(filter(filter_space, word_list))

    return word_list


# 词频统计
# 返回前 top_N 个值，如果不指定则返回所有值
def word_frequency(word_list, *top_N):
    if top_N:
        counter = Counter(word_list).most_common(top_N[0])
    else:
        counter = Counter(word_list).most_common()

    return counter


def lyric_emotion(song_id):
    res = dao.find_by_id(song_id)
    lyric = dao.remove_stop_words(res['lyric'])
    emotions = []
    result = []
    i = 0
    for line in lyric.replace(' ', '').split('\n'):
        i += 1
        emotions.append([i, jiagu.sentiment(line)])
    for emotion in emotions:
        if emotion[1][0] == 'positive':
            result.append([emotion[0], round(emotion[1][1], 2)])
        else:
            result.append([emotion[0], -1 * round(emotion[1][1], 2)])
    return {'name': '《' + res['name'] + '》', 'data': result}


def comments_time(song_id):
    times = []
    res = dao.find_by_id(song_id)
    for i in res['comments']:
        time_str = time.localtime(i['time'] // 1000)
        times.append(time_str.tm_hour)
    times_dict = Counter(times)
    data = {'y': [], 'x': []}
    for key in sorted(times_dict):
        data['x'].append(str(key)+'点')
        data['y'].append(times_dict[key])
    return data


if __name__ == '__main__':
    pass
