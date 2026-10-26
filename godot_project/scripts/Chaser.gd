extends Node2D
class_name Chaser

@export var follow_distance: float = 220.0
@export var speed: float = 300.0

var is_slipped: bool = false
var slip_timer: float = 0.0
var shout_text: String = "მოგდევ!"
var shout_timer: float = 0.0
var shout_interval: float = 4.5
var frame_timer: float = 0.0

var georgian_shouts = [
	"მოგდევ!",
	"გისმენ ბინძურო!",
	"სად გარბიხარ?!",
	"ქაღალდს არ შეგარჩენ!",
	"დაბრუნდი აქ!"
]

func _process(dt: float) -> void:
	if is_slipped:
		slip_timer -= dt
		rotation = lerp_angle(rotation, PI * 0.45, dt * 10.0)
		if slip_timer <= 0.0:
			is_slipped = false
			rotation = 0.0
	else:
		rotation = 0.0
		frame_timer += dt * 10.0

	# Periodic comic shout
	shout_interval -= dt
	if shout_interval <= 0.0 and not is_slipped:
		shout_text = georgian_shouts[randi() % georgian_shouts.size()]
		shout_timer = 2.0
		shout_interval = randf_range(5.0, 9.0)

	if shout_timer > 0.0:
		shout_timer -= dt

	queue_redraw()

func trip_banana() -> void:
	is_slipped = true
	slip_timer = 2.4
	shout_text = "ვაი ჩემი სათვალე!"
	shout_timer = 2.2
	position.x = max(20.0, position.x - 140.0)

func distract_with_bone() -> void:
	shout_text = "ჰაჰა, ძვალი!"
	shout_timer = 2.0
	position.x = max(20.0, position.x - 160.0)

func _draw() -> void:
	# 1. Ground Drop Shadow
	draw_ellipse(Vector2(0, 52), 24, 6, Color(0, 0, 0, 0.4))

	# 2. Dark Outfit & Denim
	draw_rect(Rect2(-14, 16, 12, 34), Color("#18181B"), true)
	draw_rect(Rect2(2, 16, 12, 34), Color("#18181B"), true)
	draw_rect(Rect2(-16, -18, 32, 36), Color("#09090B"), true)

	# 3. Head & Skin
	draw_circle(Vector2(0, -32), 16, Color("#FBBF24"))

	# 4. Curly Dark Hair Clusters
	var hair_color := Color("#1C1917")
	draw_circle(Vector2(-12, -42), 8, hair_color)
	draw_circle(Vector2(0, -46), 9, hair_color)
	draw_circle(Vector2(12, -42), 8, hair_color)
	draw_circle(Vector2(-16, -34), 7, hair_color)
	draw_circle(Vector2(16, -34), 7, hair_color)

	# 5. Blue Iconic Spectacles / Glasses
	draw_arc(Vector2(-6, -34), 5.5, 0, 2 * PI, 12, Color("#3B82F6"), 2.0)
	draw_arc(Vector2(6, -34), 5.5, 0, 2 * PI, 12, Color("#3B82F6"), 2.0)
	draw_line(Vector2(-1, -34), Vector2(1, -34), Color("#3B82F6"), 2.0)

	# 6. Comic Speech Bubble with Georgian text
	if shout_timer > 0.0:
		var font = ThemeDB.fallback_font
		var text_w = font.get_string_size(shout_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x + 16.0
		# White bubble with red border
		draw_rect(Rect2(10, -78, text_w, 28), Color("#FFFFFF"), true)
		draw_rect(Rect2(10, -78, text_w, 28), Color("#DC2626"), false, 2.0)
		# Tail to mouth
		var tail = PackedVector2Array([Vector2(10, -56), Vector2(4, -48), Vector2(16, -56)])
		draw_colored_polygon(tail, Color("#FFFFFF"))
		draw_polyline(tail, Color("#DC2626"), 2.0)
		draw_string(font, Vector2(18, -60), shout_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("#991B1B"))

func draw_ellipse(center: Vector2, rx: float, ry: float, color: Color) -> void:
	var points = PackedVector2Array()
	var segments = 16
	for i in range(segments):
		var theta = i * (2 * PI / segments)
		points.append(center + Vector2(cos(theta) * rx, sin(theta) * ry))
	draw_colored_polygon(points, color)
