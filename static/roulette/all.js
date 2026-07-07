(function () {
  let app = new Vue({
    el: '#app',
    delimiters: ['[[', ']]'],
    data: {
      prizes: [],
      prizes_2017: [],
      prizes_2018: [],
      prize_name: '',
      prize_icon: '',
      prize_rotate: [],
      prize_transition: '',
      each_deg: 0,
      rotate_deg: 0,
      start_deg: 0,
      current_deg: 0,
      index: 0,
      current_year: 2024,
      duration: 3000,
      time_remaining: 38,
      num: 0,
      numbers: [],
      isToggle: false,
      isSpinning: false,
      spinsRemaining: 0,
      prizeModalVisible: false,
      claimLoading: false,
      pendingPrize: null,
    },
    mounted() {
      let vm = this
      if (vm.current_year === 2024) {
        vm.initPrize_38()
      } else {
        vm.initPrize()
      }
      vm.loadRouletteState()
    },
    watch: {
      current_year: {
        handler: 'restart',
      }
    },
    computed: {
      canSpinWheel() {
        return this.spinsRemaining > 0 && !this.isSpinning && !this.prizeModalVisible && !this.pendingPrize
      },
      pointerClass() {
        return this.canSpinWheel ? 'pointer' : 'pointer pointer--disabled'
      },
      containerClass() {
        let vm = this
        if (vm.current_year === 2017) return 'container'
        if (vm.current_year === 2018) return 'container container-large'
        if (vm.current_year === 2024) return 'container container-38'
        return 'container container-38'
      },
      itemClass() {
        let vm = this
        if (vm.current_year === 2017) return 'item item-skew'
        if (vm.current_year === 2018) return 'item item-skew-large'
        if (vm.current_year === 2024) return 'item item-skew-38'
        return 'item item-skew-38'
      },
      contentClass() {
        let vm = this
        if (vm.current_year === 2017) return 'item-content'
        if (vm.current_year === 2018) return 'item-content item-content-large'
        if (vm.current_year === 2024) return 'item-content item-content-38'
        return 'item-content item-content-38'
      },
      countClass() {
        let vm = this
        if (vm.current_year === 2017) return 'count'
        if (vm.current_year === 2018) return 'count count-large'
        if (vm.current_year === 2024) return 'count count-38'
        return 'count count-38'
      }
    },
    methods: {
      authHeaders() {
        const token = this.getCookie('jwt_token')
        return {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      },
      prizeActive() {
        let vm = this
        setTimeout(() => {
          if (vm.$refs.item && vm.$refs.item[vm.index]) {
            vm.$refs.item[vm.index].classList.value = `${vm.itemClass} active`
          }
        }, vm.duration)
      },
      getCookie(name) {
        const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
        return match ? decodeURIComponent(match[1]) : ''
      },
      async loadRouletteState() {
        const token = this.getCookie('jwt_token')
        if (!token) return

        try {
          const { data } = await axios.get(`${getApiBase()}/roulette`, {
            headers: this.authHeaders(),
          })
          this.spinsRemaining = Number(data.roulette ?? data.spin ?? 0)
          if (data.pending) {
            this.showPendingPrize(data.pending)
          }
        } catch (error) {
          console.error('Ошибка загрузки состояния рулетки', error)
        }
      },
      showPendingPrize(pending) {
        this.pendingPrize = pending
        this.prize_name = pending.prize_name
        this.prize_icon = pending.prize_icon || 'card_giftcard'
        this.prizeModalVisible = true
      },
      async ensureSpinPermission() {
        const token = this.getCookie('jwt_token')
        if (!token) {
          showNotification('Не найден jwt_token в cookie', true)
          return false
        }
        try {
          const { data } = await axios.get(`${getApiBase()}/roulette/spin`, {
            headers: this.authHeaders(),
          })
          if (!data || data.spin === false) {
            if (data && data.pending) {
              this.showPendingPrize(data.pending)
              showNotification('Сначала получите предыдущий приз', true)
            } else {
              showNotification('Недостаточно спинов', true)
            }
            return false
          }
          this.spinsRemaining = Number(data.roulette ?? this.spinsRemaining)
          return true
        } catch (error) {
          console.error('Ошибка запроса спинов', error)
          showNotification('Не удалось проверить спины', true)
          return false
        }
      },
      async performSpin() {
        const { data } = await axios.post(`${getApiBase()}/roulette/spin`, {}, {
          headers: this.authHeaders(),
        })
        return data
      },
      async claimPrize() {
        if (this.claimLoading) return

        const token = this.getCookie('jwt_token')
        if (!token) {
          showNotification('Не найден jwt_token в cookie', true)
          return
        }

        this.claimLoading = true
        try {
          const { data } = await axios.post(`${getApiBase()}/roulette/claim`, {}, {
            headers: this.authHeaders(),
          })

          if (typeof updateUserData === 'function') {
            await updateUserData()
          }

          this.prizeModalVisible = false
          this.pendingPrize = null
          this.spinsRemaining = Number(data.roulette ?? this.spinsRemaining)
          showNotification(`Приз получен: ${data.prize_name}`)
        } catch (error) {
          console.error('Ошибка получения приза', error)
          const responseData = error.response && error.response.data
          const message = (responseData && responseData.error) || 'Не удалось получить приз'
          showNotification(message, true)
        } finally {
          this.claimLoading = false
        }
      },
      setCurrentYear(year) {
        let vm = this
        if (vm.isSpinning) return
        vm.current_year = year
      },
      restart() {
        let vm = this
        if (vm.$refs.item && vm.$refs.item[vm.index]) {
          vm.$refs.item[vm.index].classList.value = vm.itemClass
        }
        if (vm.current_year === 2017) {
          vm.time_remaining = 20
          vm.reset()
          vm.initPrize()
        } else if (vm.current_year === 2018) {
          vm.time_remaining = 120
          vm.reset()
          vm.initPrize_2018()
        } else if (vm.current_year === 2024) {
          vm.time_remaining = 38
          vm.reset()
          vm.initPrize_38()
        }
      },
      reset() {
        let vm = this
        vm.index = 0
        vm.prize_rotate = []
        vm.numbers = []
        vm.start_deg = 0
        vm.rotate_deg = `rotate(0deg)`
        vm.current_deg = 0
        vm.isSpinning = false
        vm.prize_transition = `none`
      },
      initPrize() {
        let vm = this
        axios.get('./prize20.json')
          .then(function (response) {
            vm.prizes_2017 = JSON.parse(response.request.responseText)
            vm.num = vm.prizes_2017.length
            vm.degree(vm.num)
            vm.prizes = vm.prizes_2017
            vm.numberArray()
          })
          .catch(function (error) {
            console.log(error)
          })
      },
      initPrize_38() {
        let vm = this
        axios.get('/static/roulette/prize38.json')
          .then(function (response) {
            vm.prizes = response.data
            vm.num = vm.prizes.length
            vm.degree(vm.num)
            vm.numberArray()
          })
          .catch(function (error) {
            console.log(error)
          })
      },
      initPrize_2018() {
        let vm = this
        vm.prizes_2018 = []
        for (let i = 1; i <= 120; i++) {
          let item = {}
          if (i === 1) {
            item.name = 1
            item.count = 1
            vm.prizes_2018.push(item)
          } else if (i > 1 && i <= 16) {
            item.name = i
            item.count = 1
            vm.prizes_2018.push(item)
          } else if (i === 17) {
            item.name = i
            item.count = 5
            vm.prizes_2018.push(item)
          } else if (i === 18) {
            item.name = i
            item.count = 10
            vm.prizes_2018.push(item)
          } else if (i === 19) {
            item.name = i
            item.count = 20
            vm.prizes_2018.push(item)
          } else if (i === 20) {
            item.name = i
            item.count = 69
            vm.prizes_2018.push(item)
          }
        }
        vm.num = vm.prizes_2018.length
        vm.prizes = vm.prizes_2018
        vm.degree(vm.num)
        vm.numberArray()
      },
      degree(num) {
        let vm = this
        vm.prize_rotate = []
        for (let i = 1; i <= num; i++) {
          let deg = 360 / num
          vm.each_deg = deg
          vm.prize_rotate.push(i * deg)
        }
      },
      numberArray() {
        let vm = this
        vm.numbers = vm.prizes.map((prize, index) => index)
      },
      async rotateHandler() {
        let vm = this
        if (!vm.canSpinWheel) return

        const canSpin = await vm.ensureSpinPermission()
        if (!canSpin) return

        vm.isSpinning = true
        let spinResult
        try {
          spinResult = await vm.performSpin()
        } catch (error) {
          console.error('Ошибка спина', error)
          const responseData = error.response && error.response.data
          const message = (responseData && responseData.error) || 'Не удалось выполнить спин'
          if (responseData && responseData.pending) {
            vm.showPendingPrize(responseData.pending)
          }
          showNotification(message, true)
          vm.isSpinning = false
          return
        }

        vm.spinsRemaining = Number(spinResult.roulette ?? vm.spinsRemaining)
        vm.pendingPrize = spinResult
        if (typeof updateUserData === 'function') {
          updateUserData()
        }
        vm.prize_draw(spinResult)
      },
      prize_draw(spinResult) {
        let vm = this
        if (!spinResult) {
          vm.isSpinning = false
          return
        }

        if (vm.$refs.item && vm.$refs.item[vm.index]) {
          vm.$refs.item[vm.index].classList.value = vm.itemClass
        }

        vm.index = spinResult.prize_index
        vm.prize_name = spinResult.prize_name
        vm.prize_icon = spinResult.prize_icon || 'card_giftcard'

        let circle = 4
        let degree = vm.start_deg + circle * 360 + vm.prize_rotate[vm.index] - vm.start_deg % 360

        vm.start_deg = degree
        if (vm.current_year === 2017) {
          vm.rotate_deg = `rotate(${degree}deg)`
        } else {
          vm.rotate_deg = `rotate(${degree - vm.each_deg / 2}deg)`
        }

        vm.prize_transition = `all ${vm.duration / 1000}s cubic-bezier(0.42, 0, 0.2, 0.91)`
        vm.prizeActive()

        setTimeout(() => {
          vm.prizeModalVisible = true
          vm.isSpinning = false
        }, vm.duration)
      }
    },
  })
})()
