const Rx = require('rxjs')
const RxOp = require('rxjs/operators')
const EventEmitter = require('events')
//import { v1 as uuidV1 } from 'uuid'
const { v1: uuidV1 } = require('uuid')

class RxEmitter extends EventEmitter {}

/**
 * The Job class bases rxjs,
 * todo add priority quene
 * @param {callback function } error - the callback when the error of task executing
 * @param {callback function } complete - the callback when the complete of party task executing
 *
 */

/**
 * The task struct,
 * the task have 2 type, need to care status or no care
 * if task need to wait a response from other, the status of task can be set ,
 * if task don't care any response, you set NORESPONSE, after fn is called, the task is removding
 * when status is set to DONE, the task is removing
 struct {
	status:JOBSTATUS.READY
	fn:  //callback
	args: the argument of fn, a object
 } 
 */

const TASKSTATUS = {
	READY: 1,
	DOING: 2,
	WAITING: 3,
	DONE: 4,
	NONSTATUS: 5
}

const JOBSTATUS = {
	READY: 1,
	PAUSE: 2,
	STOPED: 3
}

class Job {
	constructor(error, complete) {
		this.taskList = Array()
		this.status = JOBSTATUS.READY
		this.emitter = new RxEmitter()
		this.ecall = error
		this.cplcall = complete
	}
	async idle() {
		//console.log('start idle')
		let firetrigger = new Promise((resolve) => {
			this.emitter.on('kickoff', () => {
				// console.log('kickoff event ')
				resolve()
			})
		})
		return firetrigger
	}
	async process() {
		console.log('start task process')
		while (this.status !== JOBSTATUS.STOPED) {
			if (this.status == JOBSTATUS.READY) {
				if (this.taskList.length === 0) {
					await this.idle()
					console.log('idle over from task....')
				}
				let taskRx = Rx.from(this.taskList)
				let curTasks = taskRx.pipe(
					RxOp.filter((item) => {
						// console.log(item)
						return item.status === TASKSTATUS.NONSTATUS || item.status === TASKSTATUS.READY
					}),
					RxOp.take(5)
				)

				let iswait = false
				curTasks.pipe(RxOp.isEmpty()).subscribe((res) => {
					if (res) {
						// console.log("the curTasks is null")
						iswait = true
					}
				})

				if (iswait) {
					// console.log("enter idle  from rx ....")
					await this.idle()
					// console.log("idle over from rx ....")
				}

				curTasks.subscribe({
					next: (item) => {
						switch (item.status) {
							case TASKSTATUS.NONSTATUS:
								this.removeTask(item.taskId)
								break
							case TASKSTATUS.READY:
								this.setTaskStatus(item.taskId, TASKSTATUS.DOING)
								break
							default:
								this.removeTask(item.taskId)
								break
						}
						item.task.fn(item.task.args)
					},
					error: (err) => {
						console.log('Job executing is Error: ' + err)
						if (this.errcalllback) {
							errcalllback()
						}
						// this.status = JOBSTATUS.STOPED
					},
					complete: () => {
						if (this.cplcall) {
							this.cplcall()
						}
						// console.log('current tasks complete');
					}
				})
			}
		}
		console.log('the Job process is ended')
	}

	addTask(task) {
		let kickFlag = this.taskList.length ? false : true
		let taskId = uuidV1()
		this.taskList.push({ taskId, status: TASKSTATUS.NONSTATUS, task })
		if (kickFlag) {
			this.kickOff()
		}
		return taskId
	}
	setTaskStatus(taskId, status) {
		const index = this.taskList.findIndex((it) => {
			return it.taskId === taskId
		})
		if (index !== -1) {
			this.taskList[index].status = status
		}
	}
	removeTask(taskId) {
		const index = this.taskList.findIndex((it) => {
			return it.taskId === taskId
		})

		if (index !== -1) {
			this.taskList.splice(index, 1)
		}
	}
	kickOff() {
		//console.log("send kickoff")
		this.emitter.emit('kickoff')
	}
	stopJob() {
		this.status = JOBSTATUS.STOPED
		this.kickOff() //prevent from lock in idle
	}
}

async function jobtest() {
	const jobtest = new Job()
	for (let i = 0; i < 10; i++) {
		const task = {
			fn: console.log,
			args: i
		}
		let uuid = jobtest.addTask(task)
		if (i % 2 === 0) {
			jobtest.setTaskStatus(uuid, TASKSTATUS.WAITING)
		}
	}
	jobtest.process()

	for (let i = 0; i < 3; i++) {
		const task = {
			fn: console.log,
			args: i + 10
		}
		jobtest.addTask(task)
	}
	console.log('wait 5 seconds kickoff')
	setTimeout(() => {
		//resolve()
		jobtest.kickOff()
	}, 5000)

	waiting = new Promise((resolve) => {
		console.log('input ctrl^c end')
		setTimeout(() => {
			//resolve()
			console.log('game over')
		}, 100000)
	})

	//jobtest.stopJob()
	console.log('wait 3 seconds kickoff')
	setTimeout(() => {
		//resolve()
		jobtest.kickOff()
	}, 3000)

	setTimeout(() => {
		for (let i = 0; i < 3; i++) {
			const task = {
				fn: console.log,
				args: i + 100
			}
			jobtest.addTask(task)
		}
	}, 3000)

	Promise.all([waiting])
}

//jobtest()

module.exports = {
	Job,
	JOBSTATUS,
	TASKSTATUS
}
